import { useState, useEffect, useRef } from "react";
import { isPlatform } from "@ionic/react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { LLM } from "../llm.js/llm.js";

// --- OPFS helpers ---
async function saveModelToOPFS(filename, blob) {
  if (!("storage" in navigator && "getDirectory" in navigator.storage)) {
    console.error("OPFS not supported in this browser.");
    throw new Error("OPFS not supported in this browser.");
  }
  console.log("Saving model to OPFS:", filename, "size:", blob.size);
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  console.log("Model saved to OPFS:", filename);
}

async function loadModelFromOPFS(filename) {
  if (!("storage" in navigator && "getDirectory" in navigator.storage)) {
    console.error("OPFS not supported in this browser.");
    throw new Error("OPFS not supported in this browser.");
  }
  const root = await navigator.storage.getDirectory();
  try {
    const fileHandle = await root.getFileHandle(filename);
    const file = await fileHandle.getFile();
    console.log("Loaded model from OPFS:", filename, "size:", file.size);
    return file;
  } catch (e) {
    console.warn("Model not found in OPFS:", filename);
    return null;
  }
}

// --- IndexedDB fallback ---
async function openModelDB() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("llm_model_db", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore("models", { keyPath: "filename" });
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function saveModelToIndexedDB(filename, blob) {
  const db = await openModelDB();
  const tx = db.transaction("models", "readwrite");
  const store = tx.objectStore("models");
  await store.put({ filename, data: blob });
  await tx.complete;
  db.close();
  localStorage.setItem("llm_model_downloaded", "true");
}

async function loadModelFromIndexedDB(filename) {
  const db = await openModelDB();
  const tx = db.transaction("models", "readonly");
  const store = tx.objectStore("models");
  const modelRecord = await store.get(filename);
  await tx.complete;
  db.close();
  if (modelRecord && modelRecord.data instanceof Blob) {
    return modelRecord.data;
  }
  return null;
}

// --- Main hook ---
export const useLLM = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelPath, setModelPath] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const llmInstance = useRef(null);

  const MODEL_URL =
    "https://huggingface.co/afrideva/TinyMistral-248M-GGUF/resolve/main/tinymistral-248m.q2_k.gguf";
  const MODEL_FILENAME = "tinymistral-248m.q2_k.gguf";

  useEffect(() => {
    checkModelExists();
  }, []);

  const checkModelExists = async () => {
    try {
      if (isPlatform("capacitor")) {
        await Filesystem.mkdir({
          path: "models",
          directory: Directory.Data,
          recursive: true,
        });
        const result = await Filesystem.readdir({
          path: "models",
          directory: Directory.Data,
        });

        const modelExists = result.files.some(
          (file) => file.name === MODEL_FILENAME
        );

        if (modelExists) {
          const modelFilePath = `${Directory.Data}/models/${MODEL_FILENAME}`;
          setModelPath(modelFilePath);
          setIsModelLoaded(true);
          setStatusMessage("Model loaded from device storage");
          initializeModel(modelFilePath);
          return true;
        } else {
          await downloadModel();
        }
      } else {
        // Try OPFS first
        try {
          const opfsModel = await loadModelFromOPFS(MODEL_FILENAME);
          if (opfsModel) {
            // Instead of using a blob: URL, use the HTTP path
            const opfsHttpPath = `/models/${MODEL_FILENAME}`;
            setModelPath(opfsHttpPath);
            setIsModelLoaded(true);
            setStatusMessage(
              "Model loaded from browser storage bucket (OPFS) via Service Worker"
            );
            initializeModel(opfsHttpPath);
            return true;
          }
        } catch (e) {
          // OPFS not supported or not found, fallback to IndexedDB
        }

        // Fallback: IndexedDB
        const modelDownloaded =
          localStorage.getItem("llm_model_downloaded") === "true";
        const idbModel = await loadModelFromIndexedDB(MODEL_FILENAME);
        if (idbModel) {
          const blobUrl = URL.createObjectURL(idbModel);
          setModelPath(blobUrl);
          setIsModelLoaded(true);
          setStatusMessage("Model found in browser IndexedDB");
          initializeModel(blobUrl);
          return true;
        } else {
          if (modelDownloaded) {
            localStorage.removeItem("llm_model_downloaded");
            localStorage.removeItem("llm_model_path");
            localStorage.removeItem("llm_model_timestamp");
          }

          // Check in public folder
          const publicModelPath = `${process.env.PUBLIC_URL}/models/${MODEL_FILENAME}`;
          try {
            const response = await fetch(publicModelPath, { method: "HEAD" });
            if (response.ok) {
              // When initializing the model, use the HTTP path:
              const publicModelPath = `/models/${MODEL_FILENAME}`;
              setModelPath(publicModelPath);
              setIsModelLoaded(true);
              setStatusMessage(
                "Model loaded from Service Worker/OPFS or network"
              );
              initializeModel(publicModelPath);
              return true;
            }
          } catch (err) {
            // Not found in public folder
          }
        }
      }
      setStatusMessage("Model not found, needs download");
      return false;
    } catch (err) {
      console.error("Error checking model:", err);
      return false;
    }
  };

  const downloadModel = async () => {
    try {
      console.log("Starting model download...");
      setIsLoading(true);

      // Safely create the models directory for Capacitor
      if (isPlatform("capacitor")) {
        try {
          await Filesystem.mkdir({
            path: "models",
            directory: Directory.Data,
            recursive: true,
          });
        } catch (mkdirErr) {
          if (!mkdirErr.message.includes("already exist")) {
            throw mkdirErr;
          }
        }
      }

      const response = await fetch(MODEL_URL);
      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.statusText}`);
      }

      const contentType = response.headers.get("Content-Type");
      if (!contentType || contentType.includes("text/html")) {
        throw new Error(
          "Download failed: Received HTML instead of model file. Check your model URL or authentication."
        );
      }

      const reader = response.body.getReader();
      const contentLength = +response.headers.get("Content-Length");
      let receivedLength = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;

        const progress = Math.floor((receivedLength / contentLength) * 100);
        setDownloadProgress(progress);
        setStatusMessage(`Downloading model: ${progress}%`);
      }

      const blob = new Blob(chunks);

      // Additional check: If blob is suspiciously small, abort
      if (blob.size < 1024 * 1024) {
        const text = await blob.text();
        if (text.startsWith("<!DOCTYPE html") || text.startsWith("<html")) {
          throw new Error(
            "Downloaded file is HTML, not a model. Check your Hugging Face permissions or bandwidth limits."
          );
        }
      }

      // --- Browser: Try OPFS first ---
      if (!isPlatform("capacitor")) {
        try {
          await saveModelToOPFS(MODEL_FILENAME, blob);
          // After saving, use HTTP path for model loading
          const opfsHttpPath = `/models/${MODEL_FILENAME}`;
          setModelPath(opfsHttpPath);
          setIsModelLoaded(true);
          setStatusMessage(
            "Model downloaded and saved to browser storage bucket (OPFS) via Service Worker"
          );
          initializeModel(opfsHttpPath);
          return;
        } catch (e) {
          console.error("OPFS save failed:", e);
          // OPFS not supported, fallback to IndexedDB
          await saveModelToIndexedDB(MODEL_FILENAME, blob);
          const idbUrl = URL.createObjectURL(blob);
          setModelPath(idbUrl);
          setIsModelLoaded(true);
          setStatusMessage("Model downloaded and saved to IndexedDB");
          initializeModel(idbUrl);
          return;
        }
      }

      // --- Capacitor: Save to Filesystem ---
      const base64Data = await blobToBase64(blob);
      const modelFilePath = `models/${MODEL_FILENAME}`;
      await Filesystem.writeFile({
        path: modelFilePath,
        data: base64Data,
        directory: Directory.Data,
        recursive: true,
      });

      setModelPath(modelFilePath);
      setIsModelLoaded(true);
      setStatusMessage("Model downloaded and ready to use");
      initializeModel(modelFilePath);
    } catch (err) {
      console.error("Error downloading model:", err);
      setStatusMessage("Failed to download model: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeModel = (modelFilePath) => {
    console.log("Initializing LLM model from path:", modelFilePath);

    llmInstance.current = new LLM(
      "GGUF_CPU",
      modelFilePath,
      () => setIsModelLoaded(true),
      (text) => {
        setResponse((prev) => prev + text);
      },
      () => console.log("Model run complete")
    );

    llmInstance.current.load_worker();
  };

  const generateResponse = async (userInput) => {
    // Make sure userInput is a complete string, not just the first word
    if (!userInput || typeof userInput !== 'string') {
      console.error("Invalid user input:", userInput);
      return "I couldn't understand that. Please try again.";
    }
    
    // Ensure we're using the full user input, not just the first word
    const fullUserInput = userInput.trim();
    
    // Load prompt template and parameters from prompt.json
    let promptTemplate = "{{USER_INPUT}}";
    let llmParams = {};
    try {
      const res = await fetch("./prompt.json");
      if (res.ok) {
        const data = await res.json();
        if (data.template) promptTemplate = data.template;
        if (data.parameters) llmParams = data.parameters;
      }
    } catch (e) {
      // fallback to default template and params
    }
    // Replace {{USER_INPUT}} with the actual user input
    const prompt = promptTemplate.replace('{{USER_INPUT}}', fullUserInput);

    // Log the full prompt for debugging
    console.log("model: calling main with prompt:", fullUserInput);

    return new Promise((resolve) => {
      let fullResponse = "";
      llmInstance.current.callback = (text) => {
        fullResponse += text;
        setResponse(fullResponse);
      };

      llmInstance.current.run({
        prompt: prompt,
        // Spread any additional parameters from prompt.json
        ...llmParams,
      });

      llmInstance.current.onComplete = () => resolve(fullResponse);
    });
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.readAsDataURL(blob);
    });
  };

  return {
    isModelLoaded,
    modelPath,
    statusMessage,
    downloadProgress,
    downloadModel,
    isLoading,
    generateResponse,
  };
};
