// src/services/LLMService.jsx
// Enhanced implementation for both web and mobile platforms with Storage Buckets API fixes

import { useState, useEffect, useRef, useCallback } from "react";
import { LLM } from "../llm.js/llm.js";

// Model configuration
const MODEL_CONFIG = {
  url: "https://huggingface.co/afrideva/TinyMistral-248M-GGUF/resolve/main/tinymistral-248m.q2_k.gguf",
  filename: "tinymistral-248m.q2_k.gguf",
  bucketName: "nakprciotsystemslabs",
  size: "150MB", // For UI display
};

// Default LLM parameters
const DEFAULT_LLM_PARAMS = {
  temp: 0.7,
  top_p: 0.9,
  top_k: 40,
  repeat_penalty: 1.1,
  max_tokens: 1024,
};

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

// Hook: Unified LLM logic with improved error handling and loading states
export const useLLM = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingModel, setIsCheckingModel] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [platform, setPlatform] = useState("web");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isModelStored, setIsModelStored] = useState(false);
  const [modelSize, setModelSize] = useState(0);

  const llmInstance = useRef(null);
  const abortController = useRef(new AbortController());

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

          console.log("Capacitor plugins loaded successfully");
        } catch (e) {
          console.error("Capacitor plugin import failed:", e);
          setError("Plugin initialization failed: " + e.message);
        }
      })();
    }
  }, []);

  // Detect platform
  useEffect(() => {
    const detectPlatform = async () => {
      if (isCapacitorAvailable() && Device) {
        try {
          const info = await Device.getInfo();
          setDeviceInfo(info);
          setPlatform(info.platform);
          console.log("Platform detected:", info.platform);
        } catch (e) {
          console.error("Failed to get device info:", e);
          setPlatform("web");
        }
      } else {
        setPlatform("web");
      }
    };
    detectPlatform();
  }, []);

  // Check if Storage Buckets API is available (FIXED)
  const isStorageBucketsSupported = useCallback(() => {
    return (
      typeof navigator !== "undefined" &&
      navigator.storage &&
      navigator.storage.buckets &&
      typeof navigator.storage.buckets.open === "function"
    );
  }, []);

  // Initialize model with improved error handling
  const initializeModel = async (buffer) => {
    if (!buffer) throw new Error("Empty model buffer");

    if (llmInstance.current) {
      try {
        llmInstance.current.dispose();
        llmInstance.current = null;
      } catch (e) {
        console.warn("Disposing LLM failed:", e);
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const deviceType = "GGUF_CPU"; // Use CPU for compatibility
        setStatusMessage(`Initializing model...`);

        // Create on-progress callback for detailed status updates
        const onProgress = (progress) => {
          setStatusMessage(
            `Initializing model... ${Math.round(progress * 100)}%`
          );
        };

        // Create new LLM instance with progress callback
        const llm = new LLM(
          deviceType,
          buffer,
          () => {
            llmInstance.current = llm;
            resolve();
          },
          (text) => setResponse((prev) => prev + text),
          onProgress
        );
      } catch (e) {
        console.error("LLM initialization error:", e);
        reject(new Error(`Model initialization failed: ${e.message}`));
      }
    });
  };

  // Create or open storage bucket (for web) - FIXED IMPLEMENTATION
  const getStorageBucket = useCallback(async () => {
    if (!isStorageBucketsSupported()) {
      throw new Error("Storage Buckets API not available");
    }

    try {
      // Request permission first to avoid user gesture issues
      const permission = await navigator.permissions.query({
        name: "persistent-storage",
      });

      if (permission.state !== "granted") {
        // Try to persist storage (may require user gesture)
        const persisted = await navigator.storage.persist();
        if (!persisted) {
          console.warn("Storage may not be persistent");
        }
      }

      // FIX: Use correct API - navigate to the storage buckets API first
      // Then open our specific bucket
      const bucket = await navigator.storage.buckets.open(
        MODEL_CONFIG.bucketName,
        {
          quota: 300 * 1024 * 1024, // 300MB (ensure enough space for model)
          durability: "strict",
          persisted: true,
        }
      );

      return bucket;
    } catch (err) {
      console.error("Failed to open storage bucket:", err);
      throw new Error(`Storage bucket access failed: ${err.message}`);
    }
  }, [isStorageBucketsSupported]);

  // Download model with progress tracking and abort capability
  const downloadModel = async () => {
    if (isDownloading || isModelStored) return;

    abortController.current = new AbortController();
    setIsDownloading(true);
    setStatusMessage("Downloading model...");
    setDownloadProgress(0);
    setError(null);

    try {
      const response = await fetch(MODEL_CONFIG.url, {
        signal: abortController.current.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Download failed: ${response.status} ${response.statusText}`
        );
      }

      const contentLength = response.headers.get("content-length");
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      setModelSize(totalBytes);

      let loadedBytes = 0;
      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loadedBytes += value.length;

        if (totalBytes > 0) {
          const progress = Math.round((loadedBytes / totalBytes) * 100);
          setDownloadProgress(progress);
          setStatusMessage(`Downloading model... ${progress}%`);
        }
      }

      const concatenated = new Uint8Array(loadedBytes);
      let position = 0;
      for (const chunk of chunks) {
        concatenated.set(chunk, position);
        position += chunk.length;
      }

      const buffer = concatenated.buffer;

      // Store model in appropriate storage
      if (
        platform === "web" &&
        isStorageBucketsSupported()
      ) {
        await saveModelToStorageBucket(MODEL_CONFIG.filename, buffer);
      } else if (platform !== "web" && Filesystem) {
        await saveModelToCapacitor(buffer);
      } else {
        setStatusMessage(
          "Your browser does not support persistent storage for AI models. Please use a supported browser or platform."
        );
        setError(
          "No supported storage mechanism found (Storage Buckets API or Capacitor)."
        );
        await showToast(
          "No supported storage mechanism found. Try Chrome Canary with Storage Buckets enabled.",
          "long"
        );
        return null;
      }

      setIsModelStored(true);
      setStatusMessage("Model download completed");
      await showToast("Model download completed");

      return buffer;
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Download aborted");
        setStatusMessage("Download aborted");
        return null;
      }

      console.error("Model download failed:", err);
      setStatusMessage("Download failed");
      setError(err.message);

      await showToast(`Download failed: ${err.message}`, "long");
      throw err;
    } finally {
      setIsDownloading(false);
    }
  };

  // Cancel ongoing download
  const cancelDownload = () => {
    if (isDownloading && abortController.current) {
      abortController.current.abort();
      setIsDownloading(false);
      setStatusMessage("Download cancelled");
    }
  };

  // Load model from appropriate storage - FIXED IMPLEMENTATION
  const loadModelFromStorage = async () => {
    if (platform === "web" && isStorageBucketsSupported()) {
      try {
        const bucket = await getStorageBucket();

        try {
          // FIX 1: Use correct API to access files in the bucket
          // First get access to the file store inside the bucket
          const fileStore = await bucket.access();

          // Then get the file from the file store
          const file = await fileStore.get(MODEL_CONFIG.filename);

          if (!file) {
            throw new Error(
              `File ${MODEL_CONFIG.filename} not found in bucket`
            );
          }

          const buffer = await file.arrayBuffer();
          setModelSize(buffer.byteLength);
          console.log(
            `File ${MODEL_CONFIG.filename} loaded successfully from storage bucket (${buffer.byteLength} bytes)`
          );
          return buffer;
        } catch (err) {
          console.error("Failed to load model from storage bucket:", err);
          throw new Error(`Failed to load model: ${err.message}`);
        }
      } catch (err) {
        console.error("Failed to access storage bucket:", err);
        throw new Error(`Storage bucket access failed: ${err.message}`);
      }
    } else if (platform !== "web") {
      // Mobile platform uses Capacitor Filesystem
      try {
        if (!Filesystem) throw new Error("Filesystem not available");

        const result = await Filesystem.readFile({
          path: MODEL_CONFIG.filename,
          directory: Directory.Data,
        });

        // Convert base64 to ArrayBuffer
        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        setModelSize(bytes.buffer.byteLength);
        return bytes.buffer;
      } catch (err) {
        console.error("Failed to load model:", err);
        throw new Error(`Failed to load model: ${err.message}`);
      }
    } else {
      throw new Error("No storage mechanism available");
    }
  };

  // Check if model file exists in storage - FIXED IMPLEMENTATION
  const modelFileExists = useCallback(async () => {
    if (platform === "web" && isStorageBucketsSupported()) {
      try {
        const bucket = await getStorageBucket();

        try {
          // FIX: Use correct API to check if file exists
          const fileStore = await bucket.access();
          const keys = await fileStore.keys();

          if (keys.includes(MODEL_CONFIG.filename)) {
            // Get file metadata if available
            const file = await fileStore.get(MODEL_CONFIG.filename);
            if (file) {
              const size = file.size || (await file.arrayBuffer()).byteLength;
              setModelSize(size);
              return size > 0;
            }
          }
          return false;
        } catch (e) {
          // File doesn't exist or error checking
          console.error("Error checking if file exists:", e);
          return false;
        }
      } catch (e) {
        console.error("Failed to check if model exists in storage bucket:", e);
        return false;
      }
    } else if (platform !== "web") {
      try {
        if (Filesystem) {
          const result = await Filesystem.stat({
            path: MODEL_CONFIG.filename,
            directory: Directory.Data,
          });
          if (result && result.size > 0) {
            setModelSize(result.size);
            return true;
          }
        }
        return false;
      } catch (e) {
        return false;
      }
    }
    return false;
  }, [platform, isStorageBucketsSupported, getStorageBucket]);

  // Check model, download if needed, and initialize
  const checkModelExists = useCallback(async () => {
    setIsLoading(true);
    setIsCheckingModel(true);
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
          setStatusMessage("Model invalid. Redownloading...");

          if (platform === "web" && isStorageBucketsSupported()) {
            await deleteModelFromStorageBucket(MODEL_CONFIG.filename);
          } else if (platform !== "web") {
            await deleteModelFromCapacitor();
          }

          setIsModelStored(false);
          const newModelBuffer = await downloadModel();
          if (newModelBuffer) {
            await initializeModel(newModelBuffer);
            setIsModelLoaded(true);
            setStatusMessage("Model ready");
            await showToast("Model loaded successfully");
          }
        }
      } else {
        setStatusMessage("Model not found. Downloading...");
        const modelBuffer = await downloadModel();
        if (modelBuffer) {
          await initializeModel(modelBuffer);
          setIsModelLoaded(true);
          setStatusMessage("Model ready");
          await showToast("Model loaded successfully");
        }
      }
    } catch (err) {
      console.error("Model check error:", err);
      setStatusMessage("Model check failed");
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsCheckingModel(false);
    }
  }, [
    platform,
    initializeModel,
    downloadModel,
    loadModelFromStorage,
    modelFileExists,
    isStorageBucketsSupported,
  ]);

  // Load prompt template from JSON file
  const loadPromptTemplate = async () => {
    let promptTemplate = "{{USER_INPUT}}";
    let parameters = { ...DEFAULT_LLM_PARAMS };

    try {
      const res = await fetch("./prompt.json", { cache: "no-store" }).catch(
        () => null
      );
      if (res?.ok) {
        const json = await res.json();
        promptTemplate = json.template || promptTemplate;
        parameters = { ...parameters, ...(json.parameters || {}) };
      }
    } catch (e) {
      console.warn("Prompt template fetch failed:", e);
    }

    return { promptTemplate, parameters };
  };

  // Generate response from model with improved error handling
  const generateResponse = useCallback(
    async (userInput) => {
      if (!userInput || !userInput.trim()) {
        return null;
      }

      if (!llmInstance.current || !isModelLoaded) {
        const msg = "Model not ready. Please wait for model to load.";
        setError(msg);
        await showToast(msg);
        return null;
      }

      try {
        const { promptTemplate, parameters } = await loadPromptTemplate();
        const prompt = promptTemplate.replace(
          "{{USER_INPUT}}",
          userInput.trim()
        );

        setResponse("");
        setStatusMessage("Generating response...");
        setIsLoading(true);
        setError(null);

        await showToast("Generating response...");

        const result = await new Promise((resolve, reject) => {
          try {
            // Set up callback for streaming response
            llmInstance.current.callback = (text) => {
              setResponse((prev) => prev + text);
            };

            // Set up completion callback
            llmInstance.current.onComplete = () => {
              resolve(llmInstance.current.output || response);
            };

            // Run the model with the prompt and parameters
            llmInstance.current.run({ prompt, ...parameters });
          } catch (err) {
            console.error("LLM run failed:", err);
            reject(err);
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
    [isModelLoaded, response]
  );

  // Redownload model (for troubleshooting)
  const redownloadModel = async () => {
    try {
      setIsLoading(true);
      setIsModelLoaded(false);
      setStatusMessage("Redownloading model...");
      setError(null);

      if (llmInstance.current) {
        try {
          llmInstance.current.dispose();
        } catch (e) {
          console.warn("Disposing LLM failed:", e);
        }
        llmInstance.current = null;
      }

      if (platform === "web" && isStorageBucketsSupported()) {
        await deleteModelFromStorageBucket(MODEL_CONFIG.filename);
      } else if (platform !== "web") {
        await deleteModelFromCapacitor();
      }

      const modelBuffer = await downloadModel();
      if (modelBuffer) {
        await initializeModel(modelBuffer);
        setIsModelLoaded(true);
        setStatusMessage("Model ready");
        await showToast("Model redownloaded and initialized");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Redownload error:", err);
      setError(`Redownload error: ${err.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (llmInstance.current) {
        try {
          llmInstance.current.dispose();
        } catch (e) {
          console.warn("Disposing LLM failed on unmount:", e);
        }
      }

      // Cancel any ongoing downloads
      if (isDownloading) {
        abortController.current.abort();
      }
    };
  }, [isDownloading]);

  // Return hook interface
  return {
    isModelLoaded,
    statusMessage,
    downloadProgress,
    isLoading,
    isCheckingModel,
    response,
    error,
    deviceInfo,
    platform,
    modelSize,
    generateResponse,
    downloadModel,
    cancelDownload,
    redownloadModel,
    checkModelExists,
  };
};

// Validate GGUF model format (enhanced checks)
const isValidGGUF = async (modelData) => {
  try {
    // Basic size check - GGUF models should be at least 100KB
    if (!modelData || modelData.byteLength < 100 * 1024) {
      console.warn("Model data is too small to be valid GGUF");
      return false;
    }

    // Check for GGUF magic number at the beginning
    // GGUF files start with bytes corresponding to 'GGUF' in ASCII
    const header = new Uint8Array(modelData, 0, 4);
    const magicBytes = [0x47, 0x47, 0x55, 0x46]; // 'GGUF' in hex

    // Compare header with magic bytes
    const hasValidMagic = header.every((byte, i) => byte === magicBytes[i]);

    if (!hasValidMagic) {
      console.warn("Model does not have valid GGUF header");
      return false;
    }

    // Additional version check (optional)
    const version = new DataView(modelData).getUint32(4, true); // Little endian
    console.log(`GGUF version: ${version}`);

    // Versions above 100 are likely invalid
    if (version > 100) {
      console.warn("Model has suspicious GGUF version number");
      return false;
    }

    console.log("Model passed GGUF validation");
    return true;
  } catch (err) {
    console.error("GGUF validation failed:", err);
    return false;
  }
};

// Save model to Capacitor filesystem with optimized base64 conversion
const saveModelToCapacitor = async (buffer) => {
  try {
    if (!Filesystem) throw new Error("Filesystem not available");

    // Convert ArrayBuffer to base64 in chunks to avoid memory issues
    const chunkSize = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(buffer.byteLength / chunkSize);
    let base64Data = "";

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, buffer.byteLength);
      const chunk = buffer.slice(start, end);

      const binary = Array.from(new Uint8Array(chunk))
        .map((byte) => String.fromCharCode(byte))
        .join("");

      base64Data += btoa(binary);
    }

    await Filesystem.writeFile({
      path: MODEL_CONFIG.filename,
      data: base64Data,
      directory: Directory.Data,
    });

    console.log(
      `File ${MODEL_CONFIG.filename} saved to Capacitor (${buffer.byteLength} bytes)`
    );
  } catch (err) {
    console.error("Failed to save model to Capacitor:", err);
    throw new Error(`Failed to save model: ${err.message}`);
  }
};

// Save model to Storage Bucket (web) with optimized chunking - FIXED IMPLEMENTATION
const saveModelToStorageBucket = async (filename, buffer) => {
  // if (!isStorageBucketsSupported()) {
  //   throw new Error("Storage Buckets API not available");
  // }
  typeof navigator !== "undefined" &&
    navigator.storage &&
    navigator.storage.buckets &&
    typeof navigator.storage.buckets.open === "function";
  try {
    // FIX: Access the buckets API correctly through navigator.storage.buckets
    const bucket = await navigator.storage.buckets.open(
      MODEL_CONFIG.bucketName,
      {
        quota: 300 * 1024 * 1024, // 300MB
        durability: "strict",
        persisted: true,
      }
    );

    // First check if file exists and remove it if necessary
    try {
      // FIX: Use the correct access method to get to the file store
      const fileStore = await bucket.access();

      // Check if the file exists
      const keys = await fileStore.keys();
      if (keys.includes(filename)) {
        await fileStore.delete(filename);
        console.log(`Previous model file removed`);
      }
    } catch (e) {
      console.warn("Error checking/removing existing file:", e);
      // Continue with the save operation
    }

    // FIX: Use the correct method to create and write the file
    const fileStore = await bucket.access();

    // Since there's no direct streaming API in the spec, we'll create a Blob first
    const blob = new Blob([buffer]);

    // Store the file
    await fileStore.put(filename, blob);

    console.log(
      `File ${filename} saved to storage bucket (${buffer.byteLength} bytes)`
    );
  } catch (err) {
    console.error("Failed to save model to storage bucket:", err);
    throw new Error(`Failed to save model: ${err.message}`);
  }
};

// Delete model from Storage Bucket (web) - FIXED IMPLEMENTATION
const deleteModelFromStorageBucket = async (filename) => {
  // if (!isStorageBucketsSupported()) {
  //   throw new Error("Storage Buckets API not available");
  // }

  typeof navigator !== "undefined" &&
    navigator.storage &&
    navigator.storage.buckets &&
    typeof navigator.storage.buckets.open === "function";

  try {
    // FIX: Access the buckets API correctly
    const bucket = await navigator.storage.buckets.open(
      MODEL_CONFIG.bucketName,
      {
        quota: 300 * 1024 * 1024,
        durability: "strict",
        persisted: true,
      }
    );

    // FIX: Access the file store and delete the file
    const fileStore = await bucket.access();
    await fileStore.delete(filename);

    console.log(`File ${filename} deleted from storage bucket`);
  } catch (err) {
    console.error("Failed to delete model from storage bucket:", err);
    throw new Error(`Failed to delete model: ${err.message}`);
  }
};

// Delete model from Capacitor filesystem
const deleteModelFromCapacitor = async () => {
  try {
    if (!Filesystem) throw new Error("Filesystem not available");

    await Filesystem.deleteFile({
      path: MODEL_CONFIG.filename,
      directory: Directory.Data,
    });

    console.log(`File ${MODEL_CONFIG.filename} deleted from Capacitor`);
  } catch (err) {
    console.error("Failed to delete model from Capacitor:", err);
    throw new Error(`Failed to delete model: ${err.message}`);
  }
};

// Function to check available storage space
export const checkAvailableStorage = async () => {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const availableMB = Math.round(
        (estimate.quota - estimate.usage) / (1024 * 1024)
      );
      return {
        total: Math.round(estimate.quota / (1024 * 1024)),
        used: Math.round(estimate.usage / (1024 * 1024)),
        available: availableMB,
      };
    }
    return null;
  } catch (err) {
    console.error("Failed to check storage:", err);
    return null;
  }
};

// Helper function to check if Storage Buckets API is available and properly implemented
export const checkStorageBucketsSupport = () => {
  if (typeof navigator === "undefined") return false;
  if (!navigator.storage) return false;
  if (!navigator.storage.buckets) return false;

  // Check for at least the essential methods
  const hasOpenMethod = typeof navigator.storage.buckets.open === "function";
  const hasDeleteMethod =
    typeof navigator.storage.buckets.delete === "function";

  return hasOpenMethod && hasDeleteMethod;
};
