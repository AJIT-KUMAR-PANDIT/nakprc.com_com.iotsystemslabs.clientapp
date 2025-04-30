import { useState, useEffect, useRef, useCallback } from "react";
import { LLM } from "../llm.js/llm.js";

const MODEL_CONFIG = {
  url: "https://huggingface.co/afrideva/TinyMistral-248M-GGUF/resolve/main/tinymistral-248m.q2_k.gguf",
  filename: "tinymistral-248m.q2_k.gguf",
  bucketName: "nakprciotsystemslabs",
  size: "150MB",
};

const DEFAULT_LLM_PARAMS = {
  temp: 0.7,
  top_p: 0.9,
  top_k: 40,
  repeat_penalty: 1.1,
  max_tokens: 1024,
};

let Filesystem, Directory, Device, Toast;

const isCapacitorAvailable = () =>
  typeof window !== "undefined" && window.Capacitor !== undefined;

const showToast = async (message, duration = "short") => {
  if (isCapacitorAvailable() && Toast) {
    await Toast.show({ text: message, duration });
  } else {
    console.log(`Toast: ${message}`);
  }
};

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
        const deviceType = "GGUF_CPU";
        setStatusMessage(`Initializing model...`);

        const onProgress = (progress) => {
          setStatusMessage(
            `Initializing model... ${Math.round(progress * 100)}%`
          );
        };

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

      if (platform === "web") {
        await saveModelToIndexedDB(MODEL_CONFIG.filename, buffer);
      } else if (platform !== "web" && Filesystem) {
        await saveModelToCapacitor(buffer);
      } else {
        setStatusMessage(
          "Your browser does not support persistent storage for AI models. Please use a supported browser or platform."
        );
        setError(
          "No supported storage mechanism found (IndexedDB or Capacitor)."
        );
        await showToast(
          "No supported storage mechanism found. Try a different browser or platform.",
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

  const cancelDownload = () => {
    if (isDownloading && abortController.current) {
      abortController.current.abort();
      setIsDownloading(false);
      setStatusMessage("Download cancelled");
    }
  };

  const loadModelFromStorage = async () => {
    if (platform === "web") {
      try {
        const buffer = await getModelFromIndexedDB(MODEL_CONFIG.filename);
        setModelSize(buffer.byteLength);
        console.log(
          `File ${MODEL_CONFIG.filename} loaded successfully from IndexedDB (${buffer.byteLength} bytes)`
        );
        return buffer;
      } catch (err) {
        console.error("Failed to load model from IndexedDB:", err);
        throw new Error(`Failed to load model: ${err.message}`);
      }
    } else if (platform !== "web") {
      try {
        if (!Filesystem) throw new Error("Filesystem not available");

        const result = await Filesystem.readFile({
          path: MODEL_CONFIG.filename,
          directory: Directory.Data,
        });

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

  const modelFileExists = useCallback(async () => {
    if (platform === "web") {
      try {
        const exists = await checkModelInIndexedDB(MODEL_CONFIG.filename);
        return exists;
      } catch (e) {
        console.error("Failed to check if model exists in IndexedDB:", e);
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
  }, [platform]);

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

          if (platform === "web") {
            await deleteModelFromIndexedDB(MODEL_CONFIG.filename);
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
  ]);

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
            llmInstance.current.callback = (text) => {
              setResponse((prev) => prev + text);
            };

            llmInstance.current.onComplete = () => {
              resolve(llmInstance.current.output || response);
            };

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

      if (platform === "web") {
        await deleteModelFromIndexedDB(MODEL_CONFIG.filename);
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

  const resetModel = async () => {
    try {
      setIsLoading(true);
      setIsModelLoaded(false);
      setStatusMessage("Resetting model...");
      setError(null);

      if (llmInstance.current) {
        try {
          llmInstance.current.dispose();
        } catch (e) {
          console.warn("Disposing LLM failed:", e);
        }
        llmInstance.current = null;
      }

      if (platform === "web") {
        await deleteModelFromIndexedDB(MODEL_CONFIG.filename);
      } else if (platform !== "web") {
        await deleteModelFromCapacitor();
      }

      setIsModelStored(false);
      setStatusMessage("Model reset completed");
      await showToast("Model reset completed");
    } catch (err) {
      console.error("Reset model error:", err);
      setError(`Reset model error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (llmInstance.current) {
        try {
          llmInstance.current.dispose();
        } catch (e) {
          console.warn("Disposing LLM failed on unmount:", e);
        }
      }

      if (isDownloading) {
        abortController.current.abort();
      }
    };
  }, [isDownloading]);

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
    resetModel,
  };
};

const isValidGGUF = async (modelData) => {
  try {
    if (!modelData || modelData.byteLength < 100 * 1024) {
      console.warn("Model data is too small to be valid GGUF");
      return false;
    }

    const header = new Uint8Array(modelData, 0, 4);
    const magicBytes = [0x47, 0x47, 0x55, 0x46];
    const hasValidMagic = header.every((byte, i) => byte === magicBytes[i]);

    if (!hasValidMagic) {
      console.warn("Model does not have valid GGUF header");
      return false;
    }

    const version = new DataView(modelData).getUint32(4, true);
    console.log(`GGUF version: ${version}`);

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

const saveModelToCapacitor = async (buffer) => {
  try {
    if (!Filesystem) throw new Error("Filesystem not available");

    const chunkSize = 1024 * 1024;
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

const saveModelToIndexedDB = async (filename, buffer) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("AIModelDB", 1);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(new Error("IndexedDB error: " + event.target.error.message));
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("models", "readwrite");
      const objectStore = transaction.objectStore("models");

      const getRequest = objectStore.get(filename);
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          objectStore.delete(filename);
          console.log(`Previous model file removed`);
        }

        const putRequest = objectStore.put({ filename, buffer });
        putRequest.onsuccess = () => {
          console.log(
            `File ${filename} saved to IndexedDB (${buffer.byteLength} bytes)`
          );
          resolve();
        };

        putRequest.onerror = (event) => {
          console.error(
            "Failed to save model to IndexedDB:",
            event.target.error
          );
          reject(
            new Error("Failed to save model: " + event.target.error.message)
          );
        };
      };

      getRequest.onerror = (event) => {
        console.error(
          "Failed to check/remove existing file:",
          event.target.error
        );
        reject(
          new Error(
            "Failed to check/remove existing file: " +
              event.target.error.message
          )
        );
      };
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("models")) {
        db.createObjectStore("models", { keyPath: "filename" });
      }
    };
  });
};

const deleteModelFromIndexedDB = async (filename) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("AIModelDB", 1);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(new Error("IndexedDB error: " + event.target.error.message));
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("models", "readwrite");
      const objectStore = transaction.objectStore("models");

      const deleteRequest = objectStore.delete(filename);
      deleteRequest.onsuccess = () => {
        console.log(`File ${filename} deleted from IndexedDB`);
        resolve();
      };

      deleteRequest.onerror = (event) => {
        console.error(
          "Failed to delete model from IndexedDB:",
          event.target.error
        );
        reject(
          new Error("Failed to delete model: " + event.target.error.message)
        );
      };
    };
  });
};

const getModelFromIndexedDB = async (filename) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("AIModelDB", 1);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(new Error("IndexedDB error: " + event.target.error.message));
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("models", "readonly");
      const objectStore = transaction.objectStore("models");

      const getRequest = objectStore.get(filename);
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          const buffer = getRequest.result.buffer;
          resolve(buffer);
        } else {
          reject(new Error(`File ${filename} not found in IndexedDB`));
        }
      };

      getRequest.onerror = (event) => {
        console.error(
          "Failed to load model from IndexedDB:",
          event.target.error
        );
        reject(
          new Error("Failed to load model: " + event.target.error.message)
        );
      };
    };
  });
};

const checkModelInIndexedDB = async (filename) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("AIModelDB", 1);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(new Error("IndexedDB error: " + event.target.error.message));
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("models", "readonly");
      const objectStore = transaction.objectStore("models");

      const getRequest = objectStore.get(filename);
      getRequest.onsuccess = () => {
        resolve(!!getRequest.result);
      };

      getRequest.onerror = (event) => {
        console.error(
          "Failed to check model in IndexedDB:",
          event.target.error
        );
        reject(
          new Error("Failed to check model: " + event.target.error.message)
        );
      };
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("models")) {
        db.createObjectStore("models", { keyPath: "filename" });
      }
    };
  });
};

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
