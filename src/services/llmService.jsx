import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import * as webllm from "@mlc-ai/web-llm";

// Create context
const LLMContext = createContext();

// Provider component
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

  // Initialize LLM
  const initializeLLM = async () => {
    try {
      setIsLoading(true);
      setStatusMessage("Initializing LLM...");
      
      // Create a new chat instance using the WebLLM class
      const chat = new webllm.ChatModule();
      setLLM(chat);
      
      // Get platform info
      const platformInfo = await chat.detectPlatformInfo();
      setPlatform(platformInfo.backend || "unknown");
      
      setIsLoading(false);
      setStatusMessage("LLM initialized");
      return chat;
    } catch (error) {
      console.error("Error initializing LLM:", error);
      setError(error.message);
      setIsLoading(false);
      setStatusMessage("Initialization failed");
      return null;
    }
  };

  // Check if model exists
  const checkModelExists = async () => {
    try {
      setIsCheckingModel(true);
      setStatusMessage("Checking model...");
      
      if (!llm) {
        const chat = await initializeLLM();
        if (!chat) return false;
      }
      
      // Use Llama-2-7b-chat-hf-q4f16_1 as the default model
      const modelName = "Llama-2-7b-chat-hf-q4f16_1";
      
      try {
        // Try to get model info
        const modelInfo = await llm.getModelInfo(modelName);
        
        if (modelInfo) {
          setModelSize(modelInfo.model_size || 0);
          setIsModelLoaded(true);
          setStatusMessage("Model loaded");
          return true;
        } else {
          setIsModelLoaded(false);
          setStatusMessage("Model not found");
          return false;
        }
      } catch (e) {
        console.log("Model not loaded yet:", e);
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
      setStatusMessage("Starting download...");
      
      if (!llm) {
        await initializeLLM();
      }
      
      // Use Llama-2-7b-chat-hf-q4f16_1 as the default model
      const modelName = "Llama-2-7b-chat-hf-q4f16_1";
      
      await llm.loadModel(modelName, {
        progress: (progress) => {
          setDownloadProgress(progress * 100);
          setStatusMessage(`Downloading: ${Math.round(progress * 100)}%`);
        }
      });
      
      setIsModelLoaded(true);
      setStatusMessage("Model loaded successfully");
      return true;
    } catch (error) {
      console.error("Error downloading model:", error);
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
      llm.unload();
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
      
      // Use chat method
      const response = await llm.chat({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
        signal: controller.signal
      });
      
      console.log("LLM response:", response);
      
      if (!response || !response.content) {
        console.warn("Empty response from LLM");
        return null;
      }
      
      return response.content;
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
        const modelExists = await checkModelExists();
        if (!modelExists) {
          console.log("Model not loaded, attempting to download...");
          await downloadModel();
        }
      }
      
      // Retry logic for generating responses
      let response = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!response && retryCount < maxRetries) {
        try {
          console.log(`Attempt ${retryCount + 1}/${maxRetries} to generate response`);
          response = await generateResponse(userQuery);
          
          if (!response) {
            console.warn(`Attempt ${retryCount + 1}: Received null response from LLM`);
            retryCount++;
            
            if (retryCount < maxRetries) {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (error) {
          console.error(`Error in attempt ${retryCount + 1}:`, error);
          retryCount++;
          
          if (retryCount < maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
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
    initializeLLM().then(() => {
      checkModelExists();
    });
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (llm) {
        llm.unload();
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
    stopGeneration
  };

  return (
    <LLMContext.Provider value={contextValue}>
      {children}
    </LLMContext.Provider>
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
