import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLLM } from "../services/llmService";
import { useTTS } from "../services/ttsService";
import { useSpeechRecognition } from "../services/speechRecognitionService";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Loader, DownloadCloud, X } from "lucide-react";

// Hi-tech animated glowing border
const GlowingBorder = ({ children }) => (
  <div className="relative rounded-2xl overflow-hidden shadow-2xl">
    <div className="absolute inset-0 z-0 animate-glow bg-gradient-to-br from-blue-700 via-purple-600 to-pink-500 opacity-60 blur-lg" />
    <div className="relative z-10">{children}</div>
  </div>
);

const AIOverlay = ({ isOpen, onClose }) => {
  // State
  const [activeMode, setActiveMode] = useState("text"); // "text" or "voice"
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [waveform, setWaveform] = useState([]);
  const messagesEndRef = useRef(null);

  // LLM & TTS
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
    modelSize,
    platform,
  } = useLLM();
  const { speak, isSpeaking, stop: stopSpeaking } = useTTS();

  // Speech Recognition
  const {
    startListening: startSpeechRecognition,
    stopListening: stopSpeechRecognition,
    transcript: recognizedText,
  } = useSpeechRecognition();

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Voice waveform animation
  useEffect(() => {
    let interval;
    if (isListening) {
      interval = setInterval(() => {
        setWaveform(Array.from({ length: 24 }, () => Math.random()));
      }, 80);
    } else {
      setWaveform([]);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  // Handle speech recognition results
  useEffect(() => {
    if (recognizedText && isListening && activeMode === "voice") {
      setTranscript(recognizedText);
    }
  }, [recognizedText, isListening, activeMode]);

  // Handle sending message (text or voice)
  const processCommand = useCallback(
    async (text) => {
      if (!text.trim() || isProcessing) return;
      setIsProcessing(true);

      // Add user message
      setMessages((prev) => [
        ...prev,
        { type: "user", content: text, timestamp: new Date() },
      ]);

      // Add AI thinking animation
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: "Thinking...",
          isThinking: true,
          timestamp: new Date(),
        },
      ]);

      let llmResponse = "";
      try {
        llmResponse = await generateResponse(text);
      } catch (e) {
        llmResponse = "";
      }

      // Remove thinking message
      setMessages((prev) => prev.filter((msg) => !msg.isThinking));

      // Parse beraer_system and beraer_user if present
      let userResponse = llmResponse;
      let systemResponse = null;
      if (llmResponse && llmResponse.includes("beraer_system:")) {
        const sysMatch = llmResponse.match(/beraer_system:"([^"]+)"/);
        const userMatch = llmResponse.match(/beraer_user:"([^"]+)"/);
        if (sysMatch) systemResponse = sysMatch[1];
        if (userMatch) userResponse = userMatch[1];
      }

      // Add AI message
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: userResponse || "Sorry, I didn't get that.",
          timestamp: new Date(),
        },
      ]);

      // Speak if in voice mode
      if (activeMode === "voice" && userResponse) {
        await speak(userResponse);
      }

      setIsProcessing(false);

      // Optionally: handle systemResponse internally (e.g., send to backend)
      if (systemResponse) {
        // TODO: handle system command, e.g., send fetch to systemResponse URL
        // fetch(systemResponse);
      }
    },
    [generateResponse, activeMode, speak, isProcessing]
  );

  // Handle text input submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      processCommand(inputText);
      setInputText("");
    }
  };

  // Voice controls
  const handleVoiceStart = () => {
    setIsListening(true);
    startSpeechRecognition();
  };
  const handleVoiceStop = () => {
    setIsListening(false);
    stopSpeechRecognition();
    if (transcript.trim()) {
      processCommand(transcript);
      setTranscript("");
    }
  };

  // Model status UI
  const renderModelStatus = () => {
    if (isDownloading) {
      return (
        <div className="flex flex-col items-center mb-4 p-3 bg-blue-900 bg-opacity-60 rounded-lg animate-pulse">
          <DownloadCloud
            className="animate-bounce mb-2 text-blue-300"
            size={32}
          />
          <div className="text-sm font-medium mb-2 text-blue-200">
            Downloading model: {Math.round(downloadProgress)}%
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-blue-400 to-purple-500 h-2.5 rounded-full"
              style={{ width: `${downloadProgress}%` }}
            ></div>
          </div>
          <button
            onClick={cancelDownload}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            Cancel
          </button>
        </div>
      );
    }
    if (isCheckingModel) {
      return (
        <div className="flex items-center justify-center mb-4 p-3 bg-blue-900 bg-opacity-60 rounded-lg">
          <Loader className="animate-spin mr-2 text-blue-200" size={20} />
          <span className="text-sm text-blue-100">
            Checking model status...
          </span>
        </div>
      );
    }
    if (!isModelLoaded) {
      return (
        <div className="flex flex-col items-center mb-4 p-3 bg-yellow-900 bg-opacity-60 rounded-lg">
          <div className="text-sm mb-2 text-yellow-200">
            AI model not loaded
          </div>
          <button
            onClick={downloadModel}
            className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
            disabled={isDownloading || isCheckingModel}
          >
            Download Model
          </button>
          {error && <div className="text-xs text-red-300 mt-2">{error}</div>}
        </div>
      );
    }
    return (
      <div className="flex items-center mb-4 p-2 bg-green-900 bg-opacity-60 rounded-lg text-xs text-green-200">
        <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2"></span>
        <span>
          Model loaded ({platform}) - {(modelSize / (1024 * 1024)).toFixed(1)}{" "}
          MB
        </span>
      </div>
    );
  };

  // Main UI
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-gradient-to-br from-black/80 to-blue-950/90"
        >
          <GlowingBorder>
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              className="w-[95vw] max-w-2xl mx-auto bg-gradient-to-br from-blue-950 via-black to-purple-900 rounded-2xl shadow-2xl border border-blue-700/40 overflow-hidden"
              style={{ maxHeight: "90vh" }}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-blue-800/40 bg-gradient-to-r from-blue-900/80 to-purple-900/60">
                <h2 className="text-lg font-bold text-blue-200 tracking-wider flex items-center">
                  <span className="animate-pulse mr-2">
                    <BrainGlow />
                  </span>
                  Luna AI Assistant
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-blue-800/40 transition"
                >
                  <X className="text-blue-200" size={24} />
                </button>
              </div>

              {/* Model Status */}
              {renderModelStatus()}

              {/* Chat Messages */}
              <div
                className="p-4 overflow-y-auto"
                style={{ maxHeight: "48vh" }}
              >
                {messages.length === 0 ? (
                  <div className="text-center text-blue-300 py-8 animate-pulse">
                    <p>Ask me anything or control your smart home!</p>
                  </div>
                ) : (
                  messages.map((message, idx) => (
                    <div
                      key={idx}
                      className={`mb-4 flex ${
                        message.type === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`px-4 py-2 rounded-2xl max-w-[80%] shadow-lg ${
                          message.type === "user"
                            ? "bg-gradient-to-r from-blue-700 to-blue-500 text-white"
                            : message.type === "system"
                            ? "bg-gradient-to-r from-yellow-700 to-yellow-500 text-white"
                            : "bg-gradient-to-r from-purple-800 to-blue-900 text-blue-100"
                        } ${message.isThinking ? "animate-pulse" : ""}`}
                      >
                        {message.content}
                        <div className="text-xs text-blue-300 mt-1 text-right">
                          {message.timestamp &&
                            new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </motion.div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-blue-800/40 bg-gradient-to-r from-blue-900/80 to-purple-900/60">
                <form
                  onSubmit={handleSubmit}
                  className="flex items-center gap-2"
                >
                  {/* Mode Toggle */}
                  <div className="flex items-center mr-2">
                    <button
                      type="button"
                      onClick={() => setActiveMode("text")}
                      className={`p-2 rounded-l-lg transition ${
                        activeMode === "text"
                          ? "bg-blue-700 text-white shadow-lg"
                          : "bg-blue-900 text-blue-300"
                      }`}
                    >
                      <Send size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMode("voice")}
                      className={`p-2 rounded-r-lg transition ${
                        activeMode === "voice"
                          ? "bg-purple-700 text-white shadow-lg"
                          : "bg-purple-900 text-purple-300"
                      }`}
                    >
                      <Mic size={20} />
                    </button>
                  </div>
                  {/* Text Input or Voice Button */}
                  {activeMode === "text" ? (
                    <>
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-grow p-2 rounded-lg bg-blue-950 text-blue-100 border border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isProcessing || !isModelLoaded}
                      />
                      <button
                        type="submit"
                        disabled={
                          !inputText.trim() || isProcessing || !isModelLoaded
                        }
                        className={`p-2 rounded-lg transition ${
                          !inputText.trim() || isProcessing || !isModelLoaded
                            ? "bg-blue-900 text-blue-400"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {isProcessing ? (
                          <Loader className="animate-spin" size={20} />
                        ) : (
                          <Send size={20} />
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="flex-grow flex items-center">
                      <button
                        type="button"
                        onMouseDown={handleVoiceStart}
                        onMouseUp={handleVoiceStop}
                        onTouchStart={handleVoiceStart}
                        onTouchEnd={handleVoiceStop}
                        disabled={isProcessing || !isModelLoaded}
                        className={`w-full flex items-center justify-center p-3 rounded-lg transition shadow-lg ${
                          isListening
                            ? "bg-gradient-to-r from-pink-600 to-purple-700 text-white animate-pulse"
                            : isProcessing || !isModelLoaded
                            ? "bg-blue-900 text-blue-400"
                            : "bg-gradient-to-r from-blue-700 to-purple-700 text-white hover:scale-105"
                        }`}
                      >
                        <Mic size={28} className="mr-2" />
                        {isListening ? (
                          <WaveformBars waveform={waveform} />
                        ) : isProcessing ? (
                          <Loader className="animate-spin" size={20} />
                        ) : (
                          "Hold to speak"
                        )}
                      </button>
                    </div>
                  )}
                </form>
                {/* Transcript display for voice mode */}
                {activeMode === "voice" && transcript && (
                  <div className="mt-2 text-sm text-blue-200 animate-fade-in">
                    <span className="font-medium">You said:</span> {transcript}
                  </div>
                )}
              </div>
            </motion.div>
          </GlowingBorder>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Animated brain icon
const BrainGlow = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <defs>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff" stopOpacity="1" />
        <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="11" fill="url(#glow)" />
    <path
      d="M8 12a4 4 0 018 0v2a4 4 0 01-8 0v-2z"
      stroke="#fff"
      strokeWidth="2"
      fill="none"
    />
  </svg>
);

// Animated waveform for voice mode
const WaveformBars = ({ waveform }) => (
  <div className="flex items-end h-6 gap-[1px]">
    {waveform.map((v, i) => (
      <div
        key={i}
        style={{
          height: `${8 + v * 16}px`,
          width: "3px",
          background: "linear-gradient(180deg, #fff 0%, #60a5fa 100%)",
          borderRadius: "2px",
          opacity: 0.7 + 0.3 * v,
          transition: "height 0.1s",
        }}
      />
    ))}
  </div>
);

export default AIOverlay;
