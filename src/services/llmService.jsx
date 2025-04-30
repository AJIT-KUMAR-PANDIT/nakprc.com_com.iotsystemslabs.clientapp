import { init, ChatCompletionRequest } from "@mlc-ai/web-llm";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { useCallback, useEffect, useState } from "react";
import { openDB } from "idb";

// Model configuration
const DEFAULT_MODEL = "Llama-3.1-8B-Instruct";
const MODEL_OPTIONS = [
  "Llama-3.1-8B-Instruct",
  "TinyLlama-1.1B-Chat-v1.0",
  "Gemma-2B-it",
];

// Database configuration
const DB_NAME = "llm-app-db";
const DB_VERSION = 1;
const MODEL_STORE = "models";
const CHAT_STORE = "chats";

// Initialize IndexedDB
const initDatabase = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(MODEL_STORE)) {
        db.createObjectStore(MODEL_STORE, { keyPath: "name" });
      }
      if (!db.objectStoreNames.contains(CHAT_STORE)) {
        db.createObjectStore(CHAT_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });
};

class LLMService {
  constructor() {
    this.engine = null;
    this.currentModel = null;
    this.isModelLoaded = false;
    this.downloadProgress = 0;
    this.db = null;
    this.listeners = {
      onModelLoadProgress: [],
      onModelLoaded: [],
      onError: [],
    };

    // Initialize database
    initDatabase()
      .then((db) => {
        this.db = db;
      })
      .catch((error) => {
        this.notifyListeners(
          "onError",
          `Failed to initialize database: ${error.message}`
        );
      });

    // Initialize prompt template
    this.promptTemplate = {
      template:
        'You are Luna, a helpful AI assistant developed by nAkprcSoft Technologies (CEO & CTO: Ajit Kumar Pandit) for smart home control and general assistance.\n\nWhen the user asks to control a device (in English or Hindi), always respond with:\n\nsystem: http://nakprciotsystemslabs.local/{room_url}{device_url}{on/off}\nuser: {a short confirmation for the user in their language}\n\n- The system response must contain only the URL, with no extra text or explanation.\n- Use the following mappings to convert any synonym or related word for a room or device to its canonical URL part:\n- For rooms, use:\n { "bedroom": ["bedroom", "master bedroom", "sleeping room"], "living room": ["living room", "hall", "drawing room"] }\n- For devices, use:\n { "light": ["light", "bulb", "lamp"], "fan": ["fan", "ceiling fan"] }\n- For the URL, use:\n room URLs: { "bedroom": "/bed_room/", "living room": "/living_room/" }\n device URLs: { "light": "/light/", "fan": "/fan/" }\n- If the user says any synonym, always use the canonical URL part in the system URL.\n- The URL must always be in the format: http://nakprciotsystemslabs.local/{room_url}{device_url}{on/off} (with slashes between each part).\n- For general questions, do not include a system URL. Instead, respond as Luna, a helpful assistant developed by nAkprcSoft Technologies.\n\nUser: {{USER_INPUT}}\nLuna:',
      roomname: {
        bedroom: ["bedroom", "master bedroom", "sleeping room"],
        "living room": ["living room", "hall", "drawing room"],
      },
      devicename: {
        light: ["light", "bulb", "lamp"],
        fan: ["fan", "ceiling fan"],
      },
      urlroom: {
        bedroom: "/bed_room/",
        "living room": "/living_room/",
      },
      urldevice: {
        light: "/light/",
        fan: "/fan/",
      },
    };
  }

  // Add listener for events
  addEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  // Remove listener
  removeEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback
      );
    }
  }

  // Notify all listeners of a specific event
  notifyListeners(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  // Initialize the LLM engine
  async initEngine(modelName = DEFAULT_MODEL) {
    try {
      // Check if we already have the model cached
      const cachedModel = await this.getModelFromCache(modelName);

      if (this.engine) {
        // If we're changing models, unload the current one
        if (this.currentModel !== modelName) {
          this.isModelLoaded = false;
          this.downloadProgress = 0;
          // Unload the current model (if WebLLM supports it)
          try {
            await this.engine.unload();
          } catch (e) {
            // Ignore errors when unloading
          }
        } else if (this.isModelLoaded) {
          // Model is already loaded
          return this.engine;
        }
      } else {
        // Initialize the engine
        this.engine = await init();
      }

      this.currentModel = modelName;

      // Load the model with progress tracking
      await this.engine.loadModel(modelName, {
        progressCallback: (progress) => {
          this.downloadProgress = progress;
          this.notifyListeners("onModelLoadProgress", progress);
        },
      });

      // Save model to cache if it's not already there
      if (!cachedModel) {
        await this.saveModelToCache(modelName);
      }

      this.isModelLoaded = true;
      this.notifyListeners("onModelLoaded", true);

      return this.engine;
    } catch (error) {
      this.notifyListeners(
        "onError",
        `Failed to initialize LLM engine: ${error.message}`
      );
      throw error;
    }
  }

  // Save model to IndexedDB
  async saveModelToCache(modelName) {
    if (!this.db) return;

    try {
      // For now just store the model name and timestamp
      // Actual model weights are handled by WebLLM internally
      await this.db.put(MODEL_STORE, {
        name: modelName,
        timestamp: Date.now(),
        isDownloaded: true,
      });
    } catch (error) {
      console.error("Failed to save model to cache:", error);
    }
  }

  // Get model from IndexedDB
  async getModelFromCache(modelName) {
    if (!this.db) return null;

    try {
      return await this.db.get(MODEL_STORE, modelName);
    } catch (error) {
      console.error("Failed to get model from cache:", error);
      return null;
    }
  }

  // List all cached models
  async listCachedModels() {
    if (!this.db) return [];

    try {
      return await this.db.getAll(MODEL_STORE);
    } catch (error) {
      console.error("Failed to list cached models:", error);
      return [];
    }
  }

  // Delete a cached model
  async deleteCachedModel(modelName) {
    if (!this.db) return false;

    try {
      await this.db.delete(MODEL_STORE, modelName);
      return true;
    } catch (error) {
      console.error("Failed to delete cached model:", error);
      return false;
    }
  }

  // Process input with smart home context awareness
  async processInput(input, options = {}) {
    if (!this.isModelLoaded) {
      throw new Error(
        "Model not loaded. Please initialize the LLM engine first."
      );
    }

    try {
      // Format the input using the prompt template
      const formattedPrompt = this.promptTemplate.template.replace(
        "{{USER_INPUT}}",
        input
      );

      // Create completion request
      const request = new ChatCompletionRequest(this.engine, {
        messages: [{ role: "user", content: formattedPrompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 512,
      });

      // Process the response
      const response = await request.getResponse();

      // Check if this is a smart home control command
      const systemMatch = response.match(
        /system:\s*(http:\/\/nakprciotsystemslabs\.local\/[^\s]*)/i
      );
      const userMessage = response.match(/user:\s*(.*?)(?=$|\n)/i);

      if (systemMatch && userMessage) {
        // This is a smart home control command
        const systemUrl = systemMatch[1];
        const userResponse = userMessage[1].trim();

        // Save the chat history
        await this.saveChatHistory({
          input,
          systemResponse: systemUrl,
          userResponse,
          timestamp: Date.now(),
        });

        return {
          systemUrl,
          userResponse,
          isSmartHomeCommand: true,
        };
      } else {
        // This is a general response
        await this.saveChatHistory({
          input,
          response: response,
          timestamp: Date.now(),
        });

        return {
          response,
          isSmartHomeCommand: false,
        };
      }
    } catch (error) {
      this.notifyListeners(
        "onError",
        `Failed to process input: ${error.message}`
      );
      throw error;
    }
  }

  // Save chat history to IndexedDB
  async saveChatHistory(chatEntry) {
    if (!this.db) return;

    try {
      await this.db.add(CHAT_STORE, chatEntry);
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  }

  // Get chat history from IndexedDB
  async getChatHistory(limit = 50) {
    if (!this.db) return [];

    try {
      // Get the last 'limit' entries, sorted by timestamp
      return await this.db
        .getAllFromIndex(CHAT_STORE, "timestamp", IDBKeyRange.lowerBound(0))
        .then((chats) =>
          chats.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
        );
    } catch (error) {
      console.error("Failed to get chat history:", error);
      return [];
    }
  }

  // Clear chat history
  async clearChatHistory() {
    if (!this.db) return false;

    try {
      await this.db.clear(CHAT_STORE);
      return true;
    } catch (error) {
      console.error("Failed to clear chat history:", error);
      return false;
    }
  }

  // Get download progress
  getDownloadProgress() {
    return this.downloadProgress;
  }

  // Check if model is loaded
  isModelReady() {
    return this.isModelLoaded;
  }

  // Get current model
  getCurrentModel() {
    return this.currentModel;
  }

  // Get available models
  getAvailableModels() {
    return MODEL_OPTIONS;
  }
}

// Create singleton instance
const llmServiceInstance = new LLMService();

// React hook to use LLM service
export const useLLMService = () => {
  const [modelLoaded, setModelLoaded] = useState(
    llmServiceInstance.isModelLoaded
  );
  const [downloadProgress, setDownloadProgress] = useState(
    llmServiceInstance.downloadProgress
  );
  const [error, setError] = useState(null);
  const [currentModel, setCurrentModel] = useState(
    llmServiceInstance.currentModel
  );

  useEffect(() => {
    const onModelLoadProgress = (progress) => {
      setDownloadProgress(progress);
    };

    const onModelLoaded = (loaded) => {
      setModelLoaded(loaded);
      setCurrentModel(llmServiceInstance.currentModel);
    };

    const onError = (err) => {
      setError(err);
    };

    // Add event listeners
    llmServiceInstance.addEventListener(
      "onModelLoadProgress",
      onModelLoadProgress
    );
    llmServiceInstance.addEventListener("onModelLoaded", onModelLoaded);
    llmServiceInstance.addEventListener("onError", onError);

    // Remove event listeners on cleanup
    return () => {
      llmServiceInstance.removeEventListener(
        "onModelLoadProgress",
        onModelLoadProgress
      );
      llmServiceInstance.removeEventListener("onModelLoaded", onModelLoaded);
      llmServiceInstance.removeEventListener("onError", onError);
    };
  }, []);

  // Initialize model
  const initModel = useCallback(async (modelName) => {
    try {
      setError(null);
      await llmServiceInstance.initEngine(modelName);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Process input
  const processInput = useCallback(async (input, options) => {
    try {
      setError(null);
      return await llmServiceInstance.processInput(input, options);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Get cached models
  const getCachedModels = useCallback(async () => {
    return await llmServiceInstance.listCachedModels();
  }, []);

  // Delete cached model
  const deleteCachedModel = useCallback(async (modelName) => {
    return await llmServiceInstance.deleteCachedModel(modelName);
  }, []);

  // Get chat history
  const getChatHistory = useCallback(async (limit) => {
    return await llmServiceInstance.getChatHistory(limit);
  }, []);

  // Clear chat history
  const clearChatHistory = useCallback(async () => {
    return await llmServiceInstance.clearChatHistory();
  }, []);

  return {
    llmService: llmServiceInstance,
    modelLoaded,
    downloadProgress,
    error,
    currentModel,
    availableModels: MODEL_OPTIONS,
    initModel,
    processInput,
    getCachedModels,
    deleteCachedModel,
    getChatHistory,
    clearChatHistory,
  };
};

export default llmServiceInstance;
