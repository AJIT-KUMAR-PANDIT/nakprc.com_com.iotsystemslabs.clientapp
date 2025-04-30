import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLLM } from "../services/llmService";
import { useTTS } from "../services/ttsService";
import { useSpeechRecognition } from "../services/speechRecognitionService";
import {
  MessageCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RefreshCw,
  X,
  Loader,
  MessageSquare,
  Zap,
  Database,
  Brain,
  DownloadCloud,
} from "lucide-react";

const AIOverlay = ({ isOpen, onClose }) => {
  // Component state
  const [activeMode, setActiveMode] = useState("voice"); // "voice" or "text"
  const [animationComplete, setAnimationComplete] = useState(false);
  const [audioVisualizer, setAudioVisualizer] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const listeningRef = useRef(isListening);
  const debounceTimer = useRef(null);

  // Services
  const { speak, isSpeaking, stop: stopSpeaking } = useTTS();

  const {
    generateResponse,
    isModelLoaded,
    isLoading,
    downloadModel,
    downloadProgress,
    statusMessage,
    isCheckingModel,
    isDownloading,
    error,
    cancelDownload,
    stopGeneration,
    checkModelExists,
    modelSize,
    platform,
  } = useLLM();

  const {
    startListening: startSpeechRecognition,
    stopListening: stopSpeechRecognition,
    transcript: recognizedText,
  } = useSpeechRecognition();

  // Add state for UI enhancements
  const [chatHistory, setChatHistory] = useState(() => {
    // Try to load chat history from localStorage
    try {
      const saved = localStorage.getItem("luna_chat_history");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load chat history:", e);
      return [];
    }
  });

  // Handle animation completion
  useEffect(() => {
    if (isOpen) {
      setAnimationComplete(false);
      const timer = setTimeout(() => {
        setAnimationComplete(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle speech recognition
  useEffect(() => {
    listeningRef.current = isListening;
  }, [isListening]);

  // Initialize voice listening if in voice mode
  useEffect(() => {
    if (isListening && activeMode === "voice") {
      startSpeechRecognition();

      const interval = setInterval(() => {
        const bars = Array.from({ length: 20 }, () =>
          Math.floor(Math.random() * 100)
        );
        setAudioVisualizer(bars);
      }, 100);

      return () => {
        clearInterval(interval);
        stopSpeechRecognition();
      };
    } else {
      setAudioVisualizer([]);
    }
  }, [isListening, activeMode, startSpeechRecognition, stopSpeechRecognition]);

  // Process speech recognition results
  useEffect(() => {
    if (recognizedText && activeMode === "voice") {
      console.log("Speech recognition text:", recognizedText);

      if (recognizedText.toLowerCase().includes("luna")) {
        if (!isListening) {
          toggleListening();
        }
      }

      // Debounce: Only process after user stops speaking for 1 second
      if (
        isListening &&
        recognizedText &&
        !recognizedText.toLowerCase().includes("luna")
      ) {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
          const fullText = recognizedText.trim();
          console.log("Processing full command:", fullText);
          setTranscript(fullText);
          processCommand(fullText);
        }, 1000); // 1 second pause
      }
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [recognizedText, isListening]);

  // Auto-scroll chat messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when switching to text mode
  useEffect(() => {
    if (activeMode === "text" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeMode]);

  // Process voice or text command
  const processCommand = useCallback(
    async (text) => {
      if (isProcessing || !text || !text.trim()) return;

      try {
        setIsProcessing(true);
        setTranscript(text);

        // Add user message to chat
        const userMessage = {
          type: "user",
          content: text,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        if (activeMode === "voice") {
          // Wait a moment before sending to LLM when in voice mode
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Generate response from LLM
        const llmResponse = await generateResponse(text);

        // Ensure llmResponse is a valid string
        if (typeof llmResponse !== "string") {
          throw new Error("Invalid response from LLM");
        }

        // Extract system and user parts if they exist
        let systemUrl = null;
        let userResponse = llmResponse;

        const systemMatch = llmResponse.match(/^system:\s*(.+)$/m);
        if (systemMatch) {
          systemUrl = systemMatch[1].trim();
        }

        const userMatch = llmResponse.match(/^user:\s*(.+)$/m);
        if (userMatch) {
          userResponse = userMatch[1].trim();
        }

        // If system URL exists, try to call it
        if (systemUrl) {
          try {
            await fetch(systemUrl);
          } catch (err) {
            console.error("Device control API error:", err);
          }
        }

        // Set response and add to chat
        setResponse(userResponse);
        const aiMessage = {
          type: "ai",
          content: userResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);

        // Speak response if in voice mode
        if (activeMode === "voice") {
          await speak(userResponse);
        }
      } catch (error) {
        console.error("LLM error:", error);
        const errorResponse = "Sorry, I had trouble processing your request";
        setResponse(errorResponse);

        const errorMessage = {
          type: "ai",
          content: errorResponse,
          timestamp: new Date(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMessage]);

        if (activeMode === "voice") {
          await speak(errorResponse);
        }
      } finally {
        setIsProcessing(false);
        if (activeMode === "voice") {
          // Reset transcript after processing is complete
          setTranscript("");
        }
      }
    },
    [isProcessing, activeMode, generateResponse, speak]
  );

  // Toggle listening mode
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopSpeechRecognition();
      setIsListening(false);
    } else {
      setIsListening(true);
    }
  }, [isListening, stopSpeechRecognition]);

  // Handle text input submission
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (inputText.trim()) {
        processCommand(inputText);
        setInputText("");
      }
    },
    [inputText, processCommand]
  );

  // Toggle between voice and text modes
  const toggleMode = useCallback(() => {
    if (activeMode === "voice") {
      if (isListening) {
        stopSpeechRecognition();
        setIsListening(false);
      }
      setActiveMode("text");
    } else {
      setActiveMode("voice");
    }
  }, [activeMode, isListening, stopSpeechRecognition]);

  // Format timestamp for messages
  const formatTimestamp = (timestamp) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(timestamp);
  };

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    }
    if (isListening) {
      stopSpeechRecognition();
    }
    setIsListening(false);
    setTranscript("");
    setResponse("");
    onClose();
  }, [isSpeaking, isListening, stopSpeaking, stopSpeechRecognition, onClose]);

  // Handle stopping ongoing operations
  const handleStop = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    }
    if (isProcessing) {
      stopGeneration();
      setIsProcessing(false);
    }
  }, [isSpeaking, isProcessing, stopSpeaking, stopGeneration]);

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem("luna_chat_history", JSON.stringify(messages));
      } catch (e) {
        console.error("Failed to save chat history:", e);
      }
    }
  }, [messages]);

  // Enhanced model check with better error handling
  useEffect(() => {
    if (isOpen && !isModelLoaded && !isCheckingModel) {
      console.log("Checking model existence...");
      checkModelExists().catch((err) => {
        console.error("Model check failed:", err);
      });
    }
  }, [isOpen, isModelLoaded, isCheckingModel, checkModelExists]);

  // Add a more aggressive sync mechanism
  useEffect(() => {
    // Check console output for model loaded message
    const checkModelStatus = () => {
      console.log("Current model status:", {
        isModelLoaded,
        statusMessage,
        isCheckingModel,
      });

      if (!isModelLoaded) {
        checkModelExists();
      }
    };

    if (isOpen) {
      // Initial check
      checkModelStatus();

      // Set up periodic checks
      const intervalId = setInterval(checkModelStatus, 3000);
      return () => clearInterval(intervalId);
    }
  }, [isOpen, isModelLoaded, checkModelExists]);

  // Add local state for force model loaded
  const [forceModelLoaded, setForceModelLoaded] = useState(false);

  // Define effectiveModelLoaded
  const effectiveModelLoaded = isModelLoaded || forceModelLoaded;

  // Replace the nested useEffect with a proper one
  useEffect(() => {
    if (isOpen && !isModelLoaded && !forceModelLoaded) {
      // If we see "Initializing model..." in the status message, it means
      // the model is actually loaded but the state hasn't been updated
      if (statusMessage.includes("Initializing model")) {
        console.log("Model appears to be initializing, forcing loaded state");
        setForceModelLoaded(true);
      }

      // Check for specific console patterns that indicate model is loaded
      const checkForModelLoaded = () => {
        if (statusMessage.includes("Initializing model")) {
          console.log("Forcing model loaded state based on status message");
          setForceModelLoaded(true);
        }
      };

      // Run the check immediately and then periodically
      checkForModelLoaded();
      const intervalId = setInterval(checkForModelLoaded, 1000);

      return () => clearInterval(intervalId);
    }
  }, [isOpen, isModelLoaded, forceModelLoaded, statusMessage]);

  // Render download status
  const renderDownloadStatus = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="mb-6">
          <Brain size={48} className="text-blue-400 mb-2" />
          <h2 className="text-2xl font-bold mb-2">Luna AI Model</h2>
          <p className="text-gray-300">{statusMessage}</p>

          {/* Add debug info */}
          <div className="mt-2 text-xs text-gray-400">
            <p>Model loaded: {isModelLoaded ? "Yes" : "No"}</p>
            <p>Force loaded: {forceModelLoaded ? "Yes" : "No"}</p>
            <p>Checking model: {isCheckingModel ? "Yes" : "No"}</p>
            <p>Platform: {platform}</p>
          </div>
        </div>

        {/* Add a manual override button */}
        {statusMessage.includes("Initializing model") && !forceModelLoaded && (
          <div className="mt-4">
            <button
              onClick={() => setForceModelLoaded(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center mx-auto"
            >
              <RefreshCw size={16} className="mr-2" /> Force Start Assistant
            </button>
          </div>
        )}

        {/* Rest of download status UI */}
        {isDownloading && (
          <div className="w-full max-w-md">
            {/* ... existing download UI ... */}
          </div>
        )}

        {!isDownloading && !isModelLoaded && !isCheckingModel && (
          <div className="mt-4">
            <button
              onClick={downloadModel}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-md hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg flex items-center justify-center"
            >
              <DownloadCloud size={18} className="mr-2" /> Download AI Model
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-900 bg-opacity-50 rounded-md">
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => {
                setError(null);
                checkModelExists();
              }}
              className="mt-2 px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors"
            >
              <RefreshCw size={16} className="mr-2 inline" /> Try Again
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render messages
  const renderMessages = () => {
    return (
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Brain size={40} className="text-blue-400 mb-3" />
            <p className="text-lg font-medium">
              Start a conversation with Luna
            </p>
            <p className="text-sm mt-2 text-gray-400">
              Ask me anything or try voice commands
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] p-3 rounded-lg shadow-sm ${
                    message.type === "user"
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                      : message.isError
                      ? "bg-red-100 text-red-800 border border-red-200"
                      : message.isThinking
                      ? "bg-gray-100 text-gray-500 animate-pulse"
                      : "bg-white border border-gray-200 text-gray-800"
                  }`}
                >
                  {message.isThinking ? (
                    <div className="flex items-center">
                      <div className="mr-2">
                        <Loader size={14} className="animate-spin" />
                      </div>
                      <p>{message.content}</p>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                  <p className="text-xs mt-1 opacity-75">
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    );
  };

  // Render loader
  const renderLoader = () => {
    return <Loader size={18} className="animate-spin" />;
  };

  // Main render
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ${
        animationComplete ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-lg h-full max-h-[80vh] transition-transform duration-500 ${
          animationComplete ? "scale-100" : "scale-95"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-xl">
          <h2 className="text-xl font-bold flex items-center">
            <Zap className="mr-2" /> Luna AI Assistant
          </h2>
          <div className="flex items-center">
            {effectiveModelLoaded && (
              <div className="flex items-center mr-3 bg-blue-700 bg-opacity-30 px-2 py-1 rounded-full text-xs">
                <Database size={12} className="mr-1" />
                <span>{(modelSize / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
            )}
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-blue-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!effectiveModelLoaded &&
          !statusMessage.includes("Initializing model") ? (
            renderDownloadStatus()
          ) : (
            <>
              {/* Messages Area */}
              {renderMessages()}

              {/* Input Area */}
              <div className="border-t p-4 bg-gray-50">
                {activeMode === "voice" ? (
                  <div className="flex flex-col">
                    {isListening && (
                      <div className="flex items-end justify-center h-16 gap-[2px] mb-4">
                        {audioVisualizer.map((height, index) => (
                          <div
                            key={index}
                            className="w-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-150"
                            style={{ height: `${height}%` }}
                          ></div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center">
                      <button
                        onClick={toggleListening}
                        disabled={isProcessing}
                        className={`p-4 rounded-full mr-3 shadow-lg ${
                          isListening
                            ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                            : "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                        } ${
                          isProcessing ? "opacity-50 cursor-not-allowed" : ""
                        } transform transition-transform hover:scale-105 active:scale-95`}
                      >
                        {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                      </button>

                      <div className="flex-1 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                        {transcript ? (
                          <p className="text-gray-700">{transcript}</p>
                        ) : (
                          <p className="text-gray-500">
                            {isListening
                              ? "Listening..."
                              : "Press the mic button to speak"}
                          </p>
                        )}
                      </div>

                      <div className="flex ml-2">
                        {isProcessing && (
                          <button
                            onClick={handleStop}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors mr-2 shadow-sm"
                          >
                            <X size={20} />
                          </button>
                        )}
                        <button
                          onClick={toggleMode}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors shadow-sm"
                        >
                          <MessageSquare size={20} />
                        </button>
                      </div>
                    </div>

                    {isSpeaking && (
                      <div className="flex items-center justify-between mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
                        <div className="flex items-center">
                          <Volume2
                            size={16}
                            className="text-blue-500 mr-2 animate-pulse"
                          />
                          <p className="text-sm text-blue-800">Speaking...</p>
                        </div>
                        <button
                          onClick={stopSpeaking}
                          className="text-blue-800 hover:bg-blue-100 p-1 rounded-full"
                        >
                          <VolumeX size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 p-3 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      disabled={isProcessing}
                    />
                    <button
                      type="submit"
                      disabled={isProcessing || !inputText.trim()}
                      className={`p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-r-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm ${
                        isProcessing || !inputText.trim()
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {isProcessing ? renderLoader() : "Send"}
                    </button>
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="p-3 ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors shadow-sm"
                    >
                      <Mic size={20} />
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIOverlay;
