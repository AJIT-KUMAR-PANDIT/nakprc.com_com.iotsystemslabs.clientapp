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

  // Effect to check for existing model
  useEffect(() => {
    if (isOpen && !isModelLoaded && !isCheckingModel) {
      checkModelExists();
    }
  }, [isOpen, isModelLoaded, isCheckingModel, checkModelExists]);

  // Ensure UI syncs when model is loaded from IndexedDB
  useEffect(() => {
    if (
      statusMessage.toLowerCase().includes("loaded successfully") &&
      !isModelLoaded
    ) {
      // Model loaded from IndexedDB, update UI state
      checkModelExists();
    }
  }, [statusMessage, isModelLoaded, checkModelExists]);

  // Fix: After download, check for model and update state
  useEffect(() => {
    if (
      !isDownloading &&
      !isCheckingModel &&
      !isModelLoaded &&
      statusMessage.toLowerCase().includes("completed")
    ) {
      checkModelExists();
    }
  }, [
    isDownloading,
    isCheckingModel,
    isModelLoaded,
    statusMessage,
    checkModelExists,
  ]);

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

  // Render download status
  const renderDownloadStatus = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Downloading AI Model</h2>
        <p className="mb-4">{statusMessage}</p>

        {isDownloading && (
          <>
            <div className="w-full max-w-md bg-gray-200 rounded-full h-4 mb-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
            <p className="mb-4">{downloadProgress.toFixed(1)}% complete</p>
            <p className="text-sm mb-4">
              Model size: {(modelSize / (1024 * 1024)).toFixed(1)} MB
            </p>
            <button
              onClick={cancelDownload}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Cancel Download
            </button>
          </>
        )}

        {!isDownloading && !isModelLoaded && !isCheckingModel && (
          <button
            onClick={downloadModel}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
          >
            <RefreshCw size={16} className="mr-2" /> Download Model
          </button>
        )}

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    );
  };

  // Audio visualizer bars
  const renderAudioVisualizer = () => {
    return (
      <div className="flex items-end justify-center h-12 gap-1 mb-4">
        {audioVisualizer.map((height, index) => (
          <div
            key={index}
            className="w-1 bg-blue-500 rounded-t transition-all"
            style={{ height: `${height}%` }}
          ></div>
        ))}
      </div>
    );
  };

  // Render messages history
  const renderMessages = () => {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Start a conversation with Luna</p>
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
                  className={`max-w-3/4 p-3 rounded-lg ${
                    message.type === "user"
                      ? "bg-blue-500 text-white"
                      : message.isError
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p>{message.content}</p>
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

  // Render loading animation
  const renderLoader = () => (
    <div className="flex items-center justify-center h-8 w-8">
      <Loader className="animate-spin" size={20} />
    </div>
  );

  // Main render
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${
        animationComplete ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`bg-white rounded-lg shadow-xl flex flex-col w-full max-w-lg h-full max-h-[80vh] transition-transform duration-500 ${
          animationComplete ? "scale-100" : "scale-95"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <MessageCircle className="mr-2" /> Luna AI Assistant
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isModelLoaded ? (
            renderDownloadStatus()
          ) : (
            <>
              {/* Messages Area */}
              {renderMessages()}

              {/* Input Area */}
              <div className="border-t p-4">
                {activeMode === "voice" ? (
                  <div className="flex flex-col">
                    {isListening && renderAudioVisualizer()}

                    <div className="flex items-center">
                      <button
                        onClick={toggleListening}
                        disabled={isProcessing}
                        className={`p-3 rounded-full mr-3 ${
                          isListening
                            ? "bg-red-500 text-white"
                            : "bg-blue-500 text-white"
                        } ${
                          isProcessing ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>

                      <div className="flex-1">
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

                      <div className="flex">
                        {isProcessing && (
                          <button
                            onClick={handleStop}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors mr-2"
                          >
                            <X size={20} />
                          </button>
                        )}
                        <button
                          onClick={toggleMode}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <MessageSquare size={20} />
                        </button>
                      </div>
                    </div>

                    {isSpeaking && (
                      <div className="flex items-center justify-between mt-3 p-2 bg-blue-50 rounded">
                        <p className="text-sm text-blue-800">Speaking...</p>
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
                      className="flex-1 p-3 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isProcessing}
                    />
                    <button
                      type="submit"
                      disabled={isProcessing || !inputText.trim()}
                      className={`p-3 bg-blue-500 text-white rounded-r hover:bg-blue-600 transition-colors ${
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
                      className="p-3 ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
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
