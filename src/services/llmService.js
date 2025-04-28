import { useState, useEffect } from "react";
import { isPlatform } from "@ionic/react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { LLM } from "../llm.js/llm.js"; // Import LLM class from llm.js

export const useLLM = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelPath, setModelPath] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false); // Add loading state

  const MODEL_URL =
    "https://huggingface.co/mradermacher/TinyMistral-248M-Chat-v4-GGUF/resolve/main/TinyMistral-248M-Chat-v4.IQ4_XS.gguf";
  const MODEL_FILENAME = "TinyMistral-248M-Chat-v4.IQ4_XS.gguf";
  const initialPrompt = "Hello Luna, how can you assist me today?";

  useEffect(() => {
    checkModelExists();
  }, []);

  const checkModelExists = async () => {
    try {
      if (isPlatform("capacitor")) {
        try {
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
            console.log(
              "Model not found in device storage, starting download..."
            );
            await downloadModel();
          }
        } catch (err) {
          console.error("Error checking model file:", err);
        }
      } else {
        // Web implementation - check IndexedDB
        try {
          const modelDownloaded =
            localStorage.getItem("llm_model_downloaded") === "true";

          if (modelDownloaded) {
            console.log(
              "Model download flag found in localStorage, checking IndexedDB..."
            );
          }

          const db = await openModelDB();
          const tx = db.transaction("models", "readonly");
          const store = tx.objectStore("models");
          const modelRecord = await store.get(MODEL_FILENAME);

          if (modelRecord) {
            console.log(
              "Model found in IndexedDB, size:",
              formatBytes(modelRecord.data.size)
            );
            setStatusMessage("Model found in browser storage");

            const blob = modelRecord.data;
            const blobUrl = URL.createObjectURL(blob);
            setModelPath(blobUrl);
            setIsModelLoaded(true);

            initializeModel(blobUrl);

            await tx.complete;
            db.close();
            return true;
          } else {
            if (modelDownloaded) {
              console.warn(
                "Model flag found in localStorage but model not in IndexedDB, clearing flag"
              );
              localStorage.removeItem("llm_model_downloaded");
              localStorage.removeItem("llm_model_path");
              localStorage.removeItem("llm_model_timestamp");
            }

            const publicModelPath = `${process.env.PUBLIC_URL}/models/${MODEL_FILENAME}`;

            try {
              const response = await fetch(publicModelPath, { method: "HEAD" });
              if (response.ok) {
                setModelPath(publicModelPath);
                setIsModelLoaded(true);
                setStatusMessage("Model loaded from public folder");
                initializeModel(publicModelPath);
                return true;
              }
            } catch (err) {
              console.log("Model not found in public folder");
            }
          }

          db.close();
        } catch (err) {
          console.error("Error checking model in IndexedDB:", err);
          setStatusMessage("Error checking browser storage");
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
      setIsLoading(true); // Set loading state when download starts
      
      // Ensure models directory exists
      await Filesystem.mkdir({
        path: "models",
        directory: Directory.Data,
        recursive: true,
      });
  
      const response = await fetch(MODEL_URL);
      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.statusText}`);
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
  
        // Calculate and update download progress
        const progress = Math.floor((receivedLength / contentLength) * 100);
        setDownloadProgress(progress);
        setStatusMessage(`Downloading model: ${progress}%`);
      }
  
      const blob = new Blob(chunks);
      const modelFilePath = `${Directory.Data}/models/${MODEL_FILENAME}`;
      
      await Filesystem.writeFile({
        path: modelFilePath,
        data: blob,
        directory: Directory.Data,
        recursive: true  // Add recursive flag for file creation
      });
      console.log("Model downloaded and saved to:", modelFilePath);
      setModelPath(modelFilePath);
      setIsModelLoaded(true);
      setStatusMessage("Model downloaded and ready to use");
      initializeModel(modelFilePath);
    } catch (err) {
      console.error("Error downloading model:", err);
      setStatusMessage("Failed to download model");
    } finally {
      setIsLoading(false); // Clear loading state when done
    }
  };

  return {
    isModelLoaded,
    modelPath,
    statusMessage,
    downloadProgress,
    downloadModel,
    isLoading, // Expose loading state
  };
};
