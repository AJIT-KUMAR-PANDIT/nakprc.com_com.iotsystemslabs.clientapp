import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import * as webllm from "@mlc-ai/web-llm";

// Create context
const LLMContext = createContext();

export const LLMProvider = ({ children }) => {
  const [llm, setLLM] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState(null);
  const [isCheckingModel, setIsCheckingModel] = useState(false);
  const [modelSize, setModelSize] = useState(0);
  const [platform, setPlatform] = useState("");
  const abortControllerRef = useRef(null);

  const modelName = "RedPajama-INCITE-Chat-3B-v1-q4f32_1"; // Using the supported model from test.txt

  // Log the webllm object to inspect its structure
  useEffect(() => {
    console.log("webllm:", webllm);
  }, []);

  // Initialize LLM
  const initializeLLM = async () => {
    try {
      setIsLoading(true);
      setStatusMessage("Initializing LLM...");

      // Check if webllm is available
      if (!webllm) {
        throw new Error("WebLLM library not found");
      }

      // Log the webllm module for inspection
      console.log("webllm module keys:", Object.keys(webllm));
      console.log("webllm module:", webllm);

      // Try ChatModule, fallback to Chat if not present
      let ChatClass = webllm.ChatModule || webllm.Chat;
      if (!ChatClass) {
        throw new Error("No ChatModule or Chat class is defined in webllm");
      }

      // Properly instantiate the chat object
      const chat = new ChatClass();
      // Log the chat instance for inspection
      console.log("chat instance:", chat);
      console.log("chat instance prototype methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(chat)));

      setLLM(chat);

      // Get platform info if method exists
      if (typeof chat.getPlatformInfo === "function") {
        try {
          const platformInfo = await chat.getPlatformInfo();
          setPlatform(platformInfo.backend || "unknown");
        } catch (e) {
          console.warn("Could not get platform info:", e);
          setPlatform("unknown");
        }
      } else {
        setPlatform("unknown");
      }

      setStatusMessage("LLM initialized");
      return chat;
    } catch (error) {
      console.error("Error initializing LLM:", error);
      setError(error.message);
      setStatusMessage("Initialization failed");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if model exists - FIXED function
  const checkModelExists = async () => {
    try {
      setIsCheckingModel(true);
      setStatusMessage("Checking model...");

      // Make sure LLM is initialized
      let chatInstance = llm;
      if (!chatInstance) {
        chatInstance = await initializeLLM();
        if (!chatInstance) return false;
      }

      // Check if the model is loaded by trying a simple operation
      // This is safer than relying on getModelInfo which may not exist
      try {
        // First check if getModelInfo exists and try to use it
        if (typeof chatInstance.getModelInfo === "function") {
          const modelInfo = await chatInstance.getModelInfo(modelName);
          if (modelInfo) {
            setModelSize(modelInfo.model_size || 0);
            setIsModelLoaded(true);
            setStatusMessage("Model loaded");
            return true;
          }
        }

        // Alternative check: If the model is loaded, 'isReady' might be true
        // or we can check if the model's name is in the list of loaded models
        if (typeof chatInstance.listModels === "function") {
          const models = await chatInstance.listModels();
          if (models && models.includes(modelName)) {
            setIsModelLoaded(true);
            setStatusMessage("Model loaded");
            return true;
          }
        }

        // If we reach here, the model is likely not loaded
        setIsModelLoaded(false);
        setStatusMessage("Model not found");
        return false;
      } catch (e) {
        console.log("Model checking error:", e);
        setIsModelLoaded(false);
        setStatusMessage("Model not found");
        return false;
      }
    } catch (error) {
      console.error("Error checking model:", error);
      setError(error.message);
      setIsModelLoaded(false);
      setStatusMessage("Check failed");
      return false;
    } finally {
      setIsCheckingModel(false);
    }
  };

  // Download model
  const downloadModel = async () => {
    try {
      setIsDownloading(true);
      setError(null);
      setStatusMessage("Starting model download...");

      let chatInstance = llm;
      if (!chatInstance) {
        chatInstance = await initializeLLM();
        if (!chatInstance) return false;
      }

      // Use the appropriate method depending on the API
      if (typeof chatInstance.loadModel === "function") {
        // API from test.txt
        await chatInstance.loadModel(modelName, {
          model_id: modelName,
          progress_callback: (progress) => {
            setDownloadProgress(progress * 100);
            setStatusMessage(`Downloading: ${Math.round(progress * 100)}%`);
          },
        });
      } else if (typeof chatInstance.reload === "function") {
        // Alternative API
        await chatInstance.reload(modelName, (progress) => {
          setDownloadProgress(progress * 100);
          setStatusMessage(`Downloading: ${Math.round(progress * 100)}%`);
        });
      } else {
        // Add this debug log to inspect available methods
        console.error("llm instance methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(chatInstance)));
        throw new Error("No suitable method found to load the model");
      }

      // Verify model was successfully loaded
      const isLoaded = await checkModelExists();
      if (!isLoaded) {
        throw new Error("Model failed to load properly");
      }

      setStatusMessage("Model loaded successfully");
      return true;
    } catch (error) {
      console.error("Download failed:", error);
      setError(error.message);
      setStatusMessage("Download failed");
      return false;
    } finally {
      setIsDownloading(false);
    }
  };

  // Cancel download
  const cancelDownload = () => {
    if (llm) {
      if (typeof llm.unload === "function") {
        llm.unload();
      } else if (typeof llm.terminate === "function") {
        llm.terminate();
      }

      setIsDownloading(false);
      setStatusMessage("Download canceled");
    }
  };

  // Generate response
  const generateResponse = async (prompt) => {
    if (!isModelLoaded) {
      console.warn("Model not loaded yet, cannot generate response");
      return null;
    }

    try {
      setIsLoading(true);

      // Create abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      console.log("Sending prompt to LLM:", prompt);

      // Check which method is available and use it
      let response;
      if (typeof llm.chatCompletion === "function") {
        // Method from test.txt
        response = await llm.chatCompletion({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
          stream: false,
          signal: controller.signal,
        });
      } else if (typeof llm.generate === "function") {
        // Alternative API
        response = await llm.generate(prompt, {
          temperature: 0.7,
          max_tokens: 1000,
          signal: controller.signal,
        });
      } else {
        throw new Error("No suitable method found to generate response");
      }

      console.log("LLM response:", response);

      // Handle different response formats
      let responseContent = null;
      if (response.choices?.[0]?.message?.content) {
        // Format from test.txt
        responseContent = response.choices[0].message.content;
      } else if (response.content) {
        // Alternative format
        responseContent = response.content;
      } else if (typeof response === "string") {
        // Simple string response
        responseContent = response;
      }

      if (!responseContent) {
        console.warn("Empty response from LLM");
        return null;
      }

      return responseContent;
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("LLM generation was aborted");
        return null;
      }

      console.error("Error generating response:", error);
      setError(error.message);
      return null;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Query to LLM function with retry logic
  const queryToLLM = async (userQuery) => {
    try {
      // Check if model is loaded
      if (!isModelLoaded) {
        const isAvailable = await checkModelExists();
        if (!isAvailable) {
          const downloaded = await downloadModel();
          if (!downloaded) return null;
        }
      }

      // Retry logic for generating responses
      let response = null;
      const maxRetries = 3;

      for (let i = 0; i < maxRetries && !response; i++) {
        try {
          console.log(`Attempt ${i + 1}/${maxRetries} to generate response`);
          response = await generateResponse(userQuery);

          if (!response && i < maxRetries - 1) {
            console.warn(`Retry ${i + 1}/${maxRetries}`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Error in attempt ${i + 1}:`, error);
          if (i < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      return response;
    } catch (error) {
      console.error("Error in queryToLLM:", error);
      return null;
    }
  };

  // Stop generation
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setStatusMessage("Generation stopped");
    }
  };

  // Initialize LLM on component mount
  useEffect(() => {
    const init = async () => {
      const chat = await initializeLLM();
      if (chat) {
        // Check if model is already available
        await checkModelExists();
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (llm) {
        if (typeof llm.unload === "function") {
          llm.unload();
        } else if (typeof llm.terminate === "function") {
          llm.terminate();
        }
      }
    };
  }, []);

  // Context value
  const contextValue = {
    llm,
    isModelLoaded,
    isLoading,
    isDownloading,
    downloadProgress,
    statusMessage,
    error,
    isCheckingModel,
    modelSize,
    platform,
    initializeLLM,
    checkModelExists,
    downloadModel,
    cancelDownload,
    generateResponse,
    queryToLLM,
    stopGeneration,
  };

  return (
    <LLMContext.Provider value={contextValue}>{children}</LLMContext.Provider>
  );
};

// Custom hook
export const useLLM = () => {
  const context = useContext(LLMContext);
  if (!context) {
    throw new Error("useLLM must be used within an LLMProvider");
  }
  return context;
};
