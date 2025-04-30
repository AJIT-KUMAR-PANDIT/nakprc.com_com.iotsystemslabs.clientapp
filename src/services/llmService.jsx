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

      // Create engine with proper error handling
      let engine = null;

      // Try each engine creation method with proper error handling
      if (webllm.CreateWebLLM) {
        // Try the newer API if available
        try {
          console.log("Attempting to create WebLLM engine");
          engine = await webllm.CreateWebLLM();
          console.log("WebLLM engine created successfully");
        } catch (e) {
          console.warn("WebLLM engine creation failed:", e);
        }
      }

      if (!engine && webllm.CreateWebWorkerMLCEngine) {
        try {
          console.log("Attempting to create WebWorkerMLCEngine");
          engine = await webllm.CreateWebWorkerMLCEngine();
          console.log("WebWorkerMLCEngine created successfully");
        } catch (e) {
          console.warn("WebWorkerMLCEngine failed:", e);
        }
      }

      if (!engine && webllm.CreateServiceWorkerMLCEngine) {
        try {
          console.log("Attempting to create ServiceWorkerMLCEngine");
          engine = await webllm.CreateServiceWorkerMLCEngine();
          console.log("ServiceWorkerMLCEngine created successfully");
        } catch (e) {
          console.warn("ServiceWorkerMLCEngine failed:", e);
        }
      }

      if (!engine && webllm.CreateMLCEngine) {
        try {
          console.log("Attempting to create MLCEngine");
          engine = await webllm.CreateMLCEngine();
          console.log("MLCEngine created successfully");
        } catch (e) {
          console.warn("MLCEngine failed:", e);
        }
      }

      if (!engine) {
        throw new Error("No suitable MLCEngine could be created");
      }

      // Create chat instance based on available API
      let chat;
      if (webllm.Chat && typeof webllm.Chat === "function") {
        chat = new webllm.Chat(engine);
      } else {
        // If Chat class doesn't exist, use the engine directly
        chat = engine;
      }

      setLLM(chat);

      // Get platform info if available
      if (typeof chat.getPlatformInfo === "function") {
        try {
          const platformInfo = await chat.getPlatformInfo();
          setPlatform(platformInfo.backend || "unknown");
        } catch (e) {
          console.warn("Failed to get platform info:", e);
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

  // Check if model exists
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

      // Check if the model is loaded using multiple approaches
      try {
        // Try different methods to check if model is loaded
        if (typeof chatInstance.getModelInfo === "function") {
          try {
            const modelInfo = await chatInstance.getModelInfo(modelName);
            if (modelInfo) {
              setModelSize(modelInfo.model_size || 0);
              setIsModelLoaded(true);
              setStatusMessage("Model loaded");
              return true;
            }
          } catch (e) {
            console.warn("getModelInfo failed:", e);
          }
        }

        if (typeof chatInstance.listModels === "function") {
          try {
            const models = await chatInstance.listModels();
            if (models && models.includes(modelName)) {
              setIsModelLoaded(true);
              setStatusMessage("Model loaded");
              return true;
            }
          } catch (e) {
            console.warn("listModels failed:", e);
          }
        }

        // Check for isReady property
        if (chatInstance.isReady === true) {
          setIsModelLoaded(true);
          setStatusMessage("Model ready");
          return true;
        }

        // If none of the checks passed, model is not loaded
        setIsModelLoaded(false);
        setStatusMessage("Model not found");
        return false;
      } catch (e) {
        console.error("Model checking error:", e);
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

      // Log available methods for debugging
      console.log(
        "Available methods:",
        Object.getOwnPropertyNames(Object.getPrototypeOf(chatInstance))
      );

      // Use the appropriate method depending on the API
      if (typeof chatInstance.loadModel === "function") {
        console.log("Using loadModel method");
        await chatInstance.loadModel(modelName, {
          progress_callback: (progress) => {
            setDownloadProgress(progress * 100);
            setStatusMessage(`Downloading: ${Math.round(progress * 100)}%`);
          },
        });
      } else if (typeof chatInstance.reload === "function") {
        console.log("Using reload method");
        await chatInstance.reload(modelName, (progress) => {
          setDownloadProgress(progress * 100);
          setStatusMessage(`Downloading: ${Math.round(progress * 100)}%`);
        });
      } else if (typeof chatInstance.load === "function") {
        console.log("Using load method");
        await chatInstance.load(modelName, (progress) => {
          setDownloadProgress(progress * 100);
          setStatusMessage(`Downloading: ${Math.round(progress * 100)}%`);
        });
      } else {
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
      console.log(
        "Available methods for generation:",
        Object.getOwnPropertyNames(Object.getPrototypeOf(llm))
      );

      // Check which method is available and use it
      let response;
      if (typeof llm.chatCompletion === "function") {
        console.log("Using chatCompletion method");
        response = await llm.chatCompletion({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
          stream: false,
          signal: controller.signal,
        });
      } else if (typeof llm.generate === "function") {
        console.log("Using generate method");
        response = await llm.generate(prompt, {
          temperature: 0.7,
          max_tokens: 1000,
          signal: controller.signal,
        });
      } else if (typeof llm.chat === "function") {
        console.log("Using chat method");
        response = await llm.chat(prompt, {
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
      if (response?.choices?.[0]?.message?.content) {
        // Format from test.txt
        responseContent = response.choices[0].message.content;
      } else if (response?.content) {
        // Alternative format
        responseContent = response.content;
      } else if (typeof response === "string") {
        // Simple string response
        responseContent = response;
      } else if (response?.text) {
        // Another possible format
        responseContent = response.text;
      } else if (Array.isArray(response) && response[0]?.content) {
        // Array response format
        responseContent = response[0].content;
      }

      if (!responseContent) {
        console.warn("Empty response from LLM", response);
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
