// src/services/LLMService.jsx
// Unified implementation for both web and mobile platforms using Capacitor

import { useState, useEffect, useRef, useCallback } from "react";
import { LLM } from "../llm.js/llm.js";

// Capacitor plugin references
let Filesystem, Directory, Device, Toast;
// Detect if Capacitor is available
const isCapacitorAvailable = () =>
  typeof window !== "undefined" && window.Capacitor !== undefined;

// Helper: Show toast cross-platform
const showToast = async (message, duration = "short") => {
  if (isCapacitorAvailable() && Toast) {
    await Toast.show({ text: message, duration });
  } else {
    console.log(`Toast: ${message}`);
  }
};

// Hook: Unified LLM logic
export const useLLM = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [platform, setPlatform] = useState("web");
  const [isDownloading, setIsDownloading] = useState(false); // Add flag for download status

  const llmInstance = useRef(null);

  const modelUrl =
    "https://huggingface.co/afrideva/TinyMistral-248M-GGUF/resolve/main/tinymistral-248m.q2_k.gguf";
  const modelFileName = "tinymistral-248m.q2_k.gguf";

  // Dynamic Capacitor plugin import
  useEffect(() => {
    if (isCapacitorAvailable()) {
      (async () => {
        try {
          const { Filesystem: fs, Directory: dir } = await import(
            "@capacitor/filesystem"
          );
          const { Device: dev } = await import("@capacitor/device");
          const { Toast: toast } = await import("@capacitor/toast");

          Filesystem = fs;
          Directory = dir;
          Device = dev;
          Toast = toast;
        } catch (e) {
          console.warn("Capacitor plugin import failed:", e);
        }
      })();
    }
  }, []);

  // Detect platform
  useEffect(() => {
    const detectPlatform = async () => {
      if (isCapacitorAvailable() && Device) {
        const info = await Device.getInfo();
        setDeviceInfo(info);
        setPlatform(info.platform);
        console.log("Platform detected:", info.platform);
      } else {
        setPlatform("web");
      }
    };
    detectPlatform();
  }, []);

  const initializeModel = async (buffer) => {
    if (!buffer) throw new Error("Empty model buffer");

    if (llmInstance.current) {
      try {
        llmInstance.current.dispose();
      } catch (e) {
        console.warn("Disposing LLM failed:", e);
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const deviceType = "GGUF_CPU";
        setStatusMessage(`Initializing model using ${deviceType}...`);

        const llm = new LLM(
          deviceType,
          buffer,
          () => {
            llmInstance.current = llm;
            resolve();
          },
          (text) => setResponse((prev) => prev + text)
        );
      } catch (e) {
        console.error("LLM init error:", e);
        reject(e);
      }
    });
  };

  const downloadModel = async () => {
    if (isDownloading) return; // Prevent multiple downloads
    setIsDownloading(true); // Set flag to indicate download in progress

    setStatusMessage("Downloading model...");
    setDownloadProgress(0);

    try {
      const response = await fetch(modelUrl);

      if (!response.ok) {
        throw new Error(
          `Download failed: ${response.status} ${response.statusText}`
        );
      }

      const buffer = await response.arrayBuffer();

      if ("storageBuckets" in navigator) {
        await saveModelToStorageBucket(modelFileName, buffer);
      } else if (platform === "web") {
        await saveModelToBrowserStorage(modelFileName, buffer);
      } else {
        await saveModelToCapacitor(buffer);
      }

      setStatusMessage("Model download initiated");
      await showToast("Model download initiated");

      return true;
    } catch (err) {
      console.error("Model download failed:", err);
      setStatusMessage("Download failed");
      setError(err.message);

      await showToast(`Download failed: ${err.message}`, "long");

      throw err;
    } finally {
      setIsDownloading(false); // Reset flag after download attempt
    }
  };

  const loadModelFromStorage = async () => {
    if (platform === "web") {
      // Web platform uses storage bucket
      if ("storageBuckets" in navigator) {
        return await loadModelFromStorageBucket(modelFileName);
      } else {
        return await loadModelFromBrowserStorage(modelFileName);
      }
    } else {
      // Mobile platform uses Capacitor Filesystem
      try {
        if (!Filesystem) throw new Error("Filesystem not available");

        const result = await Filesystem.readFile({
          path: modelFileName,
          directory: Directory.Data,
        });

        // Convert base64 to ArrayBuffer
        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      } catch (err) {
        console.error("Failed to load model:", err);
        throw new Error(`Failed to load model: ${err.message}`);
      }
    }
  };

  const modelFileExists = useCallback(async () => {
    if (platform === "web") {
      return await checkFileExistsInBrowserStorage(modelFileName);
    } else {
      try {
        if (Filesystem) {
          const result = await Filesystem.stat({
            path: modelFileName,
            directory: Directory.Data,
          });
          return result.size > 0;
        }
        return false;
      } catch (e) {
        return false;
      }
    }
  }, [platform, modelFileName]); // Add dependencies

  const checkModelExists = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage("Checking for model...");
    setError(null);

    try {
      const fileExists = await modelFileExists();

      if (fileExists) {
        setStatusMessage("Model found. Loading...");
        const modelData = await loadModelFromStorage();

        if (modelData && (await isValidGGUF(modelData))) {
          await initializeModel(modelData);
          setIsModelLoaded(true);
          setStatusMessage("Model ready");
          await showToast("Model loaded successfully");
        } else {
          console.log("Invalid model found, redownloading...");
          if (platform === "web") {
            await deleteModelFromBrowserStorage(modelFileName);
          } else {
            await deleteModelFromCapacitor();
          }
          await downloadModel();
        }
      } else {
        setStatusMessage("Model not found. Downloading...");
        await downloadModel();
      }
    } catch (err) {
      console.error("Model check error:", err);
      setStatusMessage("Model check failed");
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [
    platform,
    modelFileName,
    initializeModel,
    downloadModel,
    loadModelFromStorage,
    modelFileExists,
    showToast,
  ]); // Updated dependencies

  // Init on platform detected
  useEffect(() => {
    if (platform === "web" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/opfs-sw.js")
        .then((reg) => console.log("SW registered:", reg.scope))
        .catch((err) => {
          console.error("SW registration failed:", err);
          setError("Service Worker registration failed.");
        });
    }

    checkModelExists(); // Now this is called after the function is defined

    return () => {
      if (llmInstance.current) {
        try {
          llmInstance.current.dispose();
        } catch (e) {
          console.warn("Error disposing LLM instance:", e);
        }
      }
    };
  }, [platform, checkModelExists]);

  const generateResponse = useCallback(
    async (userInput) => {
      if (!userInput || !llmInstance.current || !isModelLoaded) {
        const msg = "Model not ready or input missing";
        setError(msg);
        await showToast(msg);
        return null;
      }

      let prompt = "{{USER_INPUT}}";
      let llmParams = {
        temp: 0.7,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1,
        max_tokens: 1024,
      };

      try {
        const res = await fetch("./prompt.json", { cache: "no-store" }).catch(
          () => null
        );
        if (res?.ok) {
          const json = await res.json();
          prompt = json.template || prompt;
          llmParams = { ...llmParams, ...(json.parameters || {}) };
        }
      } catch (e) {
        console.warn("Prompt template fetch failed:", e);
      }

      prompt = prompt.replace("{{USER_INPUT}}", userInput.trim());
      setResponse("");
      setStatusMessage("Generating response...");
      setIsLoading(true);

      try {
        await showToast("Generating response...");

        const result = await new Promise((resolve, reject) => {
          try {
            llmInstance.current.callback = (text) =>
              setResponse((prev) => prev + text);
            llmInstance.current.onComplete = () => {
              resolve(llmInstance.current.output || response);
            };

            llmInstance.current.run({ prompt, ...llmParams });
          } catch (err) {
            console.error("LLM run failed:", err);
            reject(err); // Use reject to handle errors
          }
        });

        setStatusMessage("Response complete");
        return result;
      } catch (err) {
        console.error("LLM run failed:", err);
        setError(`Generation failed: ${err.message}`);
        setStatusMessage("Generation failed");
        await showToast(`Error: ${err.message}`, "long");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isModelLoaded, llmInstance, response]
  ); // Updated dependencies

  const redownloadModel = async () => {
    try {
      setIsLoading(true);
      setIsModelLoaded(false);
      setStatusMessage("Redownloading model...");

      if (llmInstance.current) {
        llmInstance.current.dispose();
        llmInstance.current = null;
      }

      if (platform === "web") {
        await deleteModelFromBrowserStorage(modelFileName);
      } else {
        await deleteModelFromCapacitor();
      }

      const success = await downloadModel();
      if (success) {
        await showToast("Model redownloaded");
        return true;
      } else {
        setError("Model redownload failed");
        return false;
      }
    } catch (err) {
      console.error("Redownload error:", err);
      setError(`Redownload error: ${err.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteModelFromBrowserStorage = async (filename) => {
    try {
      // Implement logic to delete the file from browser storage
      console.log(`Attempting to delete ${filename} from browser storage`);
      localStorage.removeItem(filename);
      console.log(`File ${filename} deleted successfully from browser storage`);
    } catch (e) {
      console.error("Error deleting model from browser storage:", e);
    }
  };

  const deleteModelFromCapacitor = async () => {
    console.warn("deleteModelFromCapacitor is not yet implemented.");
  };

  const saveModelToBrowserStorage = async (filename, buffer) => {
    try {
      // Implement logic to save the buffer to browser storage
      console.log(`Attempting to save ${filename} to browser storage`);
      localStorage.setItem(filename, JSON.stringify(Array.from(buffer)));
      console.log(`File ${filename} saved successfully to browser storage`);
    } catch (err) {
      console.error("Failed to save model to browser storage:", err);
      throw new Error(`Failed to save model: ${err.message}`);
    }
  };

  const loadModelFromBrowserStorage = async (filename) => {
    try {
      // Implement logic to load the file from browser storage
      console.log(`Attempting to load ${filename} from browser storage`);
      const data = localStorage.getItem(filename);
      if (!data)
        throw new Error(`File ${filename} not found in browser storage`);
      const buffer = new Uint8Array(JSON.parse(data));
      console.log(`File ${filename} loaded successfully from browser storage`);
      return buffer.buffer;
    } catch (err) {
      console.error("Failed to load model from browser storage:", err);
      throw new Error(`Failed to load model: ${err.message}`);
    }
  };

  const checkFileExistsInBrowserStorage = async (filename) => {
    try {
      // Implement logic to check if the file exists in browser storage
      const data = localStorage.getItem(filename);
      return data !== null;
    } catch (err) {
      console.error("Failed to check file existence in browser storage:", err);
      return false;
    }
  };

  return {
    isModelLoaded,
    statusMessage,
    downloadProgress,
    isLoading,
    response,
    error,
    deviceInfo,
    platform,
    generateResponse,
    redownloadModel,
  };
};

const isValidGGUF = async (modelData) => {
  try {
    // Implement validation logic for GGUF model data
    // For example, check the integrity or format of the model data
    // This is a placeholder logic, replace with actual validation
    if (modelData && modelData.byteLength > 0) {
      console.log("Model data is valid");
      return true;
    } else {
      console.warn("Model data is invalid");
      return false;
    }
  } catch (err) {
    console.error("Validation failed:", err);
    return false;
  }
};

const saveModelToCapacitor = async (buffer) => {
  try {
    if (!Filesystem) throw new Error("Filesystem not available");

    const modelFileName = "tinymistral-248m.q2_k.gguf"; // Ensure modelFileName is defined

    // Convert ArrayBuffer to base64
    const binaryString = Array.from(new Uint8Array(buffer))
      .map((byte) => String.fromCharCode(byte))
      .join("");
    const base64Data = btoa(binaryString);

    await Filesystem.writeFile({
      path: modelFileName,
      data: base64Data,
      directory: Directory.Data,
    });

    console.log(`File ${modelFileName} saved successfully to Capacitor`);
  } catch (err) {
    console.error("Failed to save model to Capacitor:", err);
    throw new Error(`Failed to save model: ${err.message}`);
  }
};

const saveModelToStorageBucket = async (filename, buffer) => {
  if ("storageBuckets" in navigator) {
    try {
      const bucket = await navigator.storageBuckets.open("myBucket", {
        quota: 1024 * 1024 * 1284, // 284 MB quota
        persistent: true, // Persistent storage
      });

      console.log("Storage bucket created:", bucket);

      const fileHandle = await bucket.getFileHandle(filename);
      const writable = await fileHandle.createWritable();
      await writable.write(buffer);
      await writable.close();

      console.log(`File ${filename} saved successfully to storage bucket`);
    } catch (err) {
      console.error("Failed to save model to storage bucket:", err);
      throw new Error(`Failed to save model: ${err.message}`);
    }
  } else {
    console.warn("Storage Buckets API not supported");
  }
};

const loadModelFromStorageBucket = async (filename) => {
  if ("storageBuckets" in navigator) {
    try {
      const bucket = await navigator.storageBuckets.open("myBucket", {
        quota: 1024 * 1024 * 284, // 284 MB quota
        persistent: true, // Persistent storage
      });

      const fileHandle = await bucket.getFileHandle(filename);
      const file = await fileHandle.getFile();
      const buffer = await file.arrayBuffer();

      console.log(`File ${filename} loaded successfully from storage bucket`);
      return buffer;
    } catch (err) {
      console.error("Failed to load model from storage bucket:", err);
      throw new Error(`Failed to load model: ${err.message}`);
    }
  } else {
    console.warn("Storage Buckets API not supported");
    throw new Error("Storage Buckets API not supported");
  }
};
