import React, { useState, useEffect, useRef } from "react";
import { Mic, Loader, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const VoiceAssistant = ({ isBlackBg, label = "Luna AI" }) => {
  // State management
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom of messages when new ones are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOverlayOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOverlayOpen]);

  // Simulate wake word detection
  useEffect(() => {
    // This would be replaced with actual wake word detection logic
    const wakeWordTimer = setTimeout(() => {
      if (Math.random() > 0.95) {
        handleOpenOverlay();
      }
    }, 30000); // Check every 30 seconds (just for demo purposes)

    return () => clearTimeout(wakeWordTimer);
  }, [isOverlayOpen]);

  // Handle starting voice recognition
  const handleStartListening = () => {
    setIsLoading(true);

    // Simulate AI processing delay
    setTimeout(() => {
      setIsListening(true);
      setIsLoading(false);
      handleOpenOverlay(); // Open the overlay when starting to listen
    }, 800);
  };

  // Handle stopping voice recognition
  const handleStopListening = () => {
    setIsListening(false);
  };

  // Open the Luna AI overlay
  const handleOpenOverlay = () => {
    setIsOverlayOpen(true);
  };

  // Close the Luna AI overlay
  const handleCloseOverlay = () => {
    setIsOverlayOpen(false);
    setIsListening(false);
  };

  // Handle sending message
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        content: inputText,
        timestamp: new Date(),
      },
    ]);

    // Clear input
    setInputText("");

    // Show AI thinking animation
    setIsAiThinking(true);

    // Simulate AI response after a short delay
    setTimeout(() => {
      const responses = [
        "I understand you're asking about that. Let me help you with that.",
        "I've processed your request and am ready to assist.",
        "Thanks for your question. Here's what I found.",
        "I'm here to help with your query. Please let me know if you need more information.",
      ];

      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: randomResponse,
          timestamp: new Date(),
        },
      ]);

      setIsAiThinking(false);

      // Simulate speaking
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 3000);
    }, 1500);
  };

  return (
    <>
      {/* Voice Assistant Button */}
      <div className="voice-assistant-container flex flex-col items-center">
        <div
          className={`voice-assistant-btn rounded-full w-12 h-12 flex items-center justify-center shadow-lg cursor-pointer ${
            isBlackBg ? "bg-white text-black" : "bg-black text-white"
          }`}
          onClick={handleStartListening}
        >
          {isLoading ? (
            <Loader className="animate-spin text-blue-500" size={24} />
          ) : (
            <Mic size={24} />
          )}
          <span className="tooltip absolute bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            AI Assistant
          </span>
        </div>

        {/* Dynamic Label */}
        <span
          className={`mt-2 text-sm font-bold ${
            isBlackBg ? "text-white" : "text-black"
          }`}
        >
          {label}
        </span>
      </div>

      {/* Luna AI Overlay */}
      <AnimatePresence>
        {isOverlayOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
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
              {/* Header */}
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
                  onClick={handleCloseOverlay}
                >
                  ×
                </button>
              </div>

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
                  {isAiThinking && (
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
                  />
                </div>

                {/* Voice input button */}
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
                  onClick={() => setIsListening(!isListening)}
                >
                  <Mic size={20} />
                </motion.button>

                {/* Send button */}
                <motion.button
                  className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                >
                  <Send size={20} />
                </motion.button>
              </div>

              {/* Animated waveform at the bottom */}
              <div className="h-1 w-full bg-gray-900 relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
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

export default VoiceAssistant;
