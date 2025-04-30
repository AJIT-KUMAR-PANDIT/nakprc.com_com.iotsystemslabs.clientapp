import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
// import { useLLMService } from "../services/LLMService";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { Capacitor } from "@capacitor/core";
import { Http } from "@capacitor/http";

// Icons
const MicIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
  >
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const AIOverlay = () => {
  // States
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // LLM service hook
  const {
    modelLoaded,
    downloadProgress,
    error,
    currentModel,
    availableModels,
    initModel,
    processInput,
    getCachedModels,
  } = useLLMService();

  // Effect to check if speech recognition is available
  useEffect(() => {
    const checkSpeechAvailability = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { available } = await SpeechRecognition.available();
          setSpeechEnabled(available);
        } catch (err) {
          console.error("Speech recognition not available:", err);
          setSpeechEnabled(false);
        }
      } else {
        // For web, check if SpeechRecognition is available
        const webSpeechAvailable =
          "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
        setSpeechEnabled(webSpeechAvailable);
      }
    };

    checkSpeechAvailability();
  }, []);

  // Effect to initialize model
  useEffect(() => {
    if (!modelLoaded) {
      const loadModel = async () => {
        try {
          // Check if we have any cached models first
          const cachedModels = await getCachedModels();
          if (cachedModels.length > 0) {
            const latestModel = cachedModels.sort(
              (a, b) => b.timestamp - a.timestamp
            )[0];
            await initModel(latestModel.name);
          } else {
            await initModel(); // Use default model
          }
        } catch (err) {
          console.error("Failed to initialize model:", err);
        }
      };

      loadModel();
    }
  }, [modelLoaded, initModel, getCachedModels]);

  // Effect to update progress bar
  useEffect(() => {
    setLoadingProgress(downloadProgress * 100);
  }, [downloadProgress]);

  // Effect to scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle voice input
  const handleVoiceInput = async () => {
    if (isListening) {
      // Stop listening
      try {
        if (Capacitor.isNativePlatform()) {
          await SpeechRecognition.stop();
        } else {
          // Web implementation of stopping speech recognition
          if (window.webSpeechRecognition) {
            window.webSpeechRecognition.stop();
          }
        }
      } catch (e) {
        console.error("Error stopping speech recognition", e);
      }
      setIsListening(false);
      return;
    }

    setIsListening(true);

    try {
      if (Capacitor.isNativePlatform()) {
        // Request permissions first
        const { available } = await SpeechRecognition.available();
        if (!available) {
          throw new Error("Speech recognition not available");
        }

        await SpeechRecognition.requestPermissions();

        // Start listening
        SpeechRecognition.start({
          language: "en-US",
          partialResults: true,
          popup: false,
        });

        // Add listeners
        SpeechRecognition.addListener("partialResults", (data) => {
          if (data.matches && data.matches.length > 0) {
            setInputText(data.matches[0]);
          }
        });

        SpeechRecognition.addListener("results", (data) => {
          if (data.matches && data.matches.length > 0) {
            const finalText = data.matches[0];
            setInputText(finalText);
            setIsListening(false);
            // Automatically send after voice input is complete
            handleSendMessage(finalText);
          }
        });
      } else if (
        "webkitSpeechRecognition" in window ||
        "SpeechRecognition" in window
      ) {
        // Web implementation
        const SpeechRecognitionAPI =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognitionAPI();
        window.webSpeechRecognition = recognition;

        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join("");

          setInputText(transcript);

          // If this is a final result
          if (event.results[0].isFinal) {
            setIsListening(false);
            handleSendMessage(transcript);
            recognition.stop();
          }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error", event);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } else {
        throw new Error("Speech recognition not available in this browser");
      }
    } catch (error) {
      console.error("Error with speech recognition:", error);
      setIsListening(false);
    }
  };

  // Handle text-to-speech
  const speakText = async (text) => {
    if (isSpeaking) return;

    try {
      setIsSpeaking(true);

      // Remove any system URLs if present
      const cleanText = text.replace(
        /system:\s*http:\/\/nakprciotsystemslabs\.local\/[^\s]*\s*/g,
        ""
      );

      if (Capacitor.isNativePlatform()) {
        await TextToSpeech.speak({
          text: cleanText,
          lang: "en-US",
          rate: 1.0,
          pitch: 1.0,
        });
      } else if ("speechSynthesis" in window) {
        // Web implementation
        const speech = new SpeechSynthesisUtterance(cleanText);
        speech.lang = "en-US";
        speech.rate = 1.0;
        speech.pitch = 1.0;

        speech.onend = () => {
          setIsSpeaking(false);
        };

        window.speechSynthesis.speak(speech);
      } else {
        throw new Error("Text-to-speech not available in this browser");
      }
    } catch (error) {
      console.error("Error with text-to-speech:", error);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Handle sending message to LLM
  const handleSendMessage = async (textToSend = null) => {
    const message = textToSend || inputText;
    if (!message.trim() || !modelLoaded) return;

    // Add user message to the list
    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        content: message,
        timestamp: new Date(),
      },
    ]);

    // Clear input
    setInputText("");

    try {
      // Animate the AI thinking
      setIsAnimating(true);

      // Process with LLM
      const result = await processInput(message);

      setIsAnimating(false);

      if (result.isSmartHomeCommand) {
        // This is a smart home control command
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: result.userResponse,
            systemUrl: result.systemUrl,
            timestamp: new Date(),
          },
        ]);

        // Execute the smart home command
        try {
          const response = await Http.get({
            url: result.systemUrl,
            headers: {
              "Content-Type": "application/json",
            },
          });

          console.log("Smart home command executed:", response);
        } catch (error) {
          console.error("Failed to execute smart home command:", error);
        }

        // Speak the user response
        speakText(result.userResponse);
      } else {
        // This is a general response
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: result.response,
            timestamp: new Date(),
          },
        ]);

        // Speak the response
        speakText(result.response);
      }
    } catch (error) {
      setIsAnimating(false);
      console.error("Error processing message:", error);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          type: "system",
          content: `Sorry, I encountered an error: ${error.message}`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Handle model change
  const handleModelChange = async (modelName) => {
    setShowModelSelector(false);

    if (modelName === currentModel) return;

    try {
      await initModel(modelName);
    } catch (error) {
      console.error("Failed to change model:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "system",
          content: `Failed to change model: ${error.message}`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Toggle the AI overlay
  const toggleOverlay = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      {/* Floating toggle button */}
      <motion.button
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleOverlay}
      >
        <span className="text-2xl">AI</span>
      </motion.button>

      {/* AI Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md h-4/5 bg-gray-900 rounded-xl overflow-hidden flex flex-col shadow-2xl relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Animated futuristic header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between relative overflow-hidden">
                <h2 className="text-lg font-semibold text-white z-10 flex items-center">
                  <span className="mr-2">Luna AI</span>
                  {isSpeaking && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs bg-white bg-opacity-30 rounded-full px-2 py-0.5"
                    >
                      Speaking...
                    </motion.span>
                  )}
                </h2>

                {/* Model selector button */}
                <button
                  className="text-white text-xs bg-black bg-opacity-30 rounded px-2 py-1 hover:bg-opacity-40 z-10"
                  onClick={() => setShowModelSelector((prev) => !prev)}
                >
                  {currentModel || "Select Model"} ▼
                </button>

                {/* Animated circle background */}
                <div className="absolute inset-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={`circle-${i}`}
                      className="absolute rounded-full bg-white opacity-10"
                      style={{
                        width: `${20 + i * 15}px`,
                        height: `${20 + i * 15}px`,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                      }}
                      animate={{
                        x: [0, Math.random() * 30 - 15],
                        y: [0, Math.random() * 30 - 15],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                    />
                  ))}
                </div>

                {/* Close button */}
                <button
                  className="text-white text-xl z-10 hover:text-gray-300"
                  onClick={toggleOverlay}
                >
                  ×
                </button>
              </div>

              {/* Model selector dropdown */}
              <AnimatePresence>
                {showModelSelector && (
                  <motion.div
                    className="absolute top-12 right-4 bg-gray-800 rounded shadow-lg z-20"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="p-2">
                      {availableModels.map((model) => (
                        <button
                          key={model}
                          className={`block w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-700 ${
                            model === currentModel ? "bg-blue-600" : ""
                          }`}
                          onClick={() => handleModelChange(model)}
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading bar when model is loading */}
              {(!modelLoaded || downloadProgress < 1) && (
                <div className="px-4 py-2 bg-gray-800">
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      initial={{ width: "0%" }}
                      animate={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {downloadProgress < 1
                      ? `Downloading model... ${Math.round(loadingProgress)}%`
                      : "Initializing..."}
                  </p>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="bg-red-900 bg-opacity-30 px-4 py-2 text-sm text-red-200">
                  Error: {error}
                </div>
              )}

              {/* Messages display */}
              <div className="flex-1 overflow-y-auto px-4 py-2 bg-gray-800 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <motion.div
                      className="w-16 h-16 mb-4 rounded-full bg-blue-600 bg-opacity-20 flex items-center justify-center"
                      animate={{
                        scale: [1, 1.05, 1],
                        opacity: [0.7, 1, 0.7],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                      }}
                    >
                      <span className="text-2xl">🤖</span>
                    </motion.div>
                    <p className="text-center">How can I help you today?</p>
                    <p className="text-center text-xs mt-2">
                      Try asking me to control your smart home devices or ask
                      any question.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <motion.div
                      key={index}
                      className={`flex ${
                        msg.type === "user" ? "justify-end" : "justify-start"
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * (index % 3) }}
                    >
                      <div
                        className={`max-w-xs rounded-lg px-4 py-2 ${
                          msg.type === "user"
                            ? "bg-blue-600 text-white rounded-br-none"
                            : msg.type === "system"
                            ? "bg-red-900 bg-opacity-30 text-white"
                            : "bg-gray-700 text-white rounded-bl-none"
                        }`}
                      >
                        {msg.content}

                        {msg.systemUrl && (
                          <div className="mt-1 text-xs text-blue-300 opacity-70">
                            Command sent to smart home
                          </div>
                        )}

                        <div className="text-xs opacity-50 text-right mt-1">
                          {msg.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}

                {/* Animated typing indicator when AI is thinking */}
                <AnimatePresence>
                  {isAnimating && (
                    <motion.div
                      className="flex justify-start"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="bg-gray-700 rounded-lg px-4 py-2 flex items-center space-x-1">
                        {[0, 1, 2].map((dot) => (
                          <motion.div
                            key={dot}
                            className="w-2 h-2 bg-gray-400 rounded-full"
                            animate={{ y: [0, -5, 0] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: dot * 0.2,
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Used for auto-scrolling */}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="bg-gray-900 px-4 py-3 border-t border-gray-700 flex space-x-2">
                <div className="flex-1 bg-gray-800 rounded-full overflow-hidden flex items-center px-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-transparent text-white outline-none py-2"
                    disabled={!modelLoaded || isAnimating}
                  />
                </div>

                {/* Voice input button */}
                {speechEnabled && (
                  <motion.button
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isListening
                        ? "bg-red-600 text-white"
                        : "bg-gray-700 text-blue-300"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={
                      isListening
                        ? {
                            scale: [1, 1.1, 1],
                            transition: { repeat: Infinity, duration: 1.5 },
                          }
                        : {}
                    }
                    onClick={handleVoiceInput}
                    disabled={!modelLoaded || isAnimating}
                  >
                    <MicIcon />
                  </motion.button>
                )}

                {/* Send button */}
                <motion.button
                  className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || !modelLoaded || isAnimating}
                >
                  <SendIcon />
                </motion.button>
              </div>

              {/* Animated waveform at the bottom */}
              <div className="h-1 w-full bg-gray-900 relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                  style={{
                    maskImage:
                      'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wLDUwIFExNSwzMCAzMCw1MCBRNDUsNzAgNjAsNTAgUTc1LDMwIDkwLDUwIFExMDUsNzAgMTIwLDUwIFExMzUsMzAgMTUwLDUwIFExNjUsNzAgMTgwLDUwIFExOTUsMzAgMjEwLDUwIFEyMjUsNzAgMjQwLDUwIFEyNTUsMzAgMjcwLDUwIFEyODUsNzAgMzAwLDUwIFEzMTUsMzAgMzMwLDUwIFEzNDUsNzAgMzYwLDUwIFEzNzUsMzAgMzkwLDUwIFE0MDUsNzAgNDIwLDUwIEw0MjAsNzUgTDAsNzUgWiIgZmlsbD0iI2ZmZiI+PC9wYXRoPjwvc3ZnPg==")',
                    WebkitMaskImage:
                      'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wLDUwIFExNSwzMCAzMCw1MCBRNDUsNzAgNjAsNTAgUTc1LDMwIDkwLDUwIFExMDUsNzAgMTIwLDUwIFExMzUsMzAgMTUwLDUwIFExNjUsNzAgMTgwLDUwIFExOTUsMzAgMjEwLDUwIFEyMjUsNzAgMjQwLDUwIFEyNTUsMzAgMjcwLDUwIFEyODUsNzAgMzAwLDUwIFEzMTUsMzAgMzMwLDUwIFEzNDUsNzAgMzYwLDUwIFEzNzUsMzAgMzkwLDUwIFE0MDUsNzAgNDIwLDUwIEw0MjAsNzUgTDAsNzUgWiIgZmlsbD0iI2ZmZiI+PC9wYXRoPjwvc3ZnPg==")',
                  }}
                  animate={{
                    x: ["-25%", "0%", "-25%"],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIOverlay;
