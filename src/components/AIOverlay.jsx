import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLLM } from "../services/llmService";
import { useTTS } from "../services/ttsService";
import { useSpeechRecognition } from "../services/speechRecognitionService";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  Mic,
  Send,
  Loader,
  DownloadCloud,
  X,
  Zap,
  Brain,
  Volume2,
  MessageSquare,
} from "lucide-react";

// Enhanced animated glowing border with pulse effect
const GlowingBorder = ({ children, isProcessing }) => (
  <div className="relative rounded-2xl overflow-hidden shadow-2xl">
    <motion.div
      className="absolute inset-0 z-0 bg-gradient-to-br from-blue-700 via-purple-600 to-pink-500 opacity-60 blur-lg"
      animate={{
        scale: isProcessing ? [1, 1.05, 1] : 1,
        opacity: isProcessing ? [0.6, 0.8, 0.6] : 0.6,
      }}
      transition={{
        duration: 2,
        repeat: isProcessing ? Infinity : 0,
        repeatType: "reverse",
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

// Interactive particle background effect
const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 50;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
        this.color = `hsla(${210 + Math.random() * 70}, 100%, 70%, ${
          Math.random() * 0.5 + 0.1
        })`;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const particle of particles) {
        particle.update();
        particle.draw();
      }

      requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9990] pointer-events-none"
    />
  );
};

// Neural network visualization
const NeuralNetworkVisualization = ({ isProcessing }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = 120;
    canvas.height = 80;

    const nodes = [];
    const connections = [];
    const layerCount = 3;
    const nodesPerLayer = [4, 6, 4];

    // Create nodes
    for (let layer = 0; layer < layerCount; layer++) {
      const nodeCount = nodesPerLayer[layer];
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: 20 + layer * 40,
          y: (canvas.height / (nodeCount + 1)) * (i + 1),
          layer,
        });
      }
    }

    // Create connections
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.layer < layerCount - 1) {
        for (let j = 0; j < nodes.length; j++) {
          const target = nodes[j];
          if (target.layer === node.layer + 1) {
            connections.push({
              from: i,
              to: j,
              activity: Math.random(),
              speed: Math.random() * 0.03 + 0.01,
            });
          }
        }
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      connections.forEach((conn) => {
        const fromNode = nodes[conn.from];
        const toNode = nodes[conn.to];

        if (isProcessing) {
          conn.activity = (conn.activity + conn.speed) % 1;
        }

        const gradient = ctx.createLinearGradient(
          fromNode.x,
          fromNode.y,
          toNode.x,
          toNode.y
        );

        gradient.addColorStop(0, "rgba(96, 165, 250, 0.1)");
        gradient.addColorStop(conn.activity, "rgba(167, 139, 250, 0.8)");
        gradient.addColorStop(1, "rgba(96, 165, 250, 0.1)");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((node) => {
        ctx.fillStyle =
          node.layer === 0
            ? "#60a5fa"
            : node.layer === layerCount - 1
            ? "#a78bfa"
            : "#818cf8";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();
  }, [isProcessing]);

  return (
    <canvas ref={canvasRef} className="opacity-70" width={120} height={80} />
  );
};

// Enhanced brain icon with neural animation
const BrainAnimation = () => {
  const pulseAnimation = useAnimation();

  useEffect(() => {
    pulseAnimation.start({
      scale: [1, 1.1, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 3,
        repeat: Infinity,
        repeatType: "reverse",
      },
    });
  }, [pulseAnimation]);

  return (
    <div className="relative w-8 h-8">
      <motion.div
        animate={pulseAnimation}
        className="absolute inset-0 bg-blue-500 rounded-full opacity-30 blur-md"
      />
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        className="relative z-10"
      >
        <defs>
          <radialGradient id="brainGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
            <animate
              attributeName="r"
              values="0.3;0.7;0.3"
              dur="3s"
              repeatCount="indefinite"
            />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#brainGlow)" />
        <path
          d="M9 11a3 3 0 106 0v-1M9 11v1m6-1v1m-6 0c0 2.8 2.2 5 5 5h1m-6-5H8a2 2 0 100 4h2m1-3v-3c0-.6.4-1 1-1s1 .4 1 1v3m0 0v3c0 .6.4 1 1 1s1-.4 1-1v-3m0 0h1a2 2 0 110 4h-1"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
        />
      </svg>
    </div>
  );
};

// Enhanced waveform for voice mode with fluid animation
const EnhancedWaveform = ({ waveform, isActive }) => (
  <div className="flex items-end h-6 gap-px">
    {waveform.map((v, i) => (
      <motion.div
        key={i}
        initial={{ height: 4 }}
        animate={{
          height: isActive ? `${8 + v * 16}px` : 4,
          opacity: isActive ? 0.7 + 0.3 * v : 0.5,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 10,
          mass: 0.1,
        }}
        style={{
          width: "3px",
          background: "linear-gradient(180deg, #fff 0%, #60a5fa 100%)",
          borderRadius: "2px",
        }}
      />
    ))}
  </div>
);

// Thinking dots animation
const ThinkingDots = () => {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-blue-300 rounded-full"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
};

// Message bubble with typing animation
const MessageBubble = ({ message, animate = true }) => {
  // For typing animation on new AI messages
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (message.type === "ai" && !message.isThinking && animate) {
      setIsTyping(true);
      setDisplayText("");

      const text = message.content;
      let index = 0;

      const typingInterval = setInterval(() => {
        setDisplayText(text.substring(0, index));
        index++;

        if (index > text.length) {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, 15); // Adjust typing speed

      return () => clearInterval(typingInterval);
    } else {
      setDisplayText(message.content);
    }
  }, [message, animate]);

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className={`px-4 py-2 rounded-2xl max-w-[80%] shadow-lg ${
        message.type === "user"
          ? "bg-gradient-to-r from-blue-700 to-blue-500 text-white"
          : message.type === "system"
          ? "bg-gradient-to-r from-yellow-700 to-yellow-500 text-white"
          : "bg-gradient-to-r from-purple-800 via-blue-900 to-purple-900 text-blue-100"
      } ${message.isThinking ? "animate-pulse" : ""}`}
    >
      {message.isThinking ? (
        <div className="flex items-center gap-2">
          <ThinkingDots />
          <span className="text-blue-200">Thinking</span>
        </div>
      ) : (
        <>
          {displayText}
          {isTyping && <span className="animate-pulse">|</span>}
        </>
      )}
      <div className="text-xs text-blue-300 mt-1 text-right">
        {message.timestamp &&
          new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
      </div>
    </motion.div>
  );
};

const AIOverlay = ({ isOpen, onClose }) => {
  // State
  const [activeMode, setActiveMode] = useState("text"); // "text" or "voice"
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [waveform, setWaveform] = useState(Array(24).fill(0.1));
  const [showVisualization, setShowVisualization] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, [isOpen]);

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
      setWaveform(Array(24).fill(0.1));
    }
    return () => clearInterval(interval);
  }, [isListening]);

  // Handle speech recognition results
  useEffect(() => {
    if (recognizedText && isListening && activeMode === "voice") {
      setTranscript(recognizedText);
    }
  }, [recognizedText, isListening, activeMode]);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([
          {
            type: "ai",
            content:
              "Hello! I'm Luna, your AI assistant. How can I help you today?",
            timestamp: new Date(),
          },
        ]);
      }, 600);
    }
  }, [isOpen, messages.length]);

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
        // Simulate thinking time for better experience
        const thinkingTime = Math.max(500, Math.min(1500, text.length * 20));
        await new Promise((resolve) => setTimeout(resolve, thinkingTime));

        llmResponse = await generateResponse(text);
      } catch (e) {
        llmResponse =
          "I'm having trouble processing that right now. Could you try again?";
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
        // TODO: handle system command
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

  // Model status UI with enhanced animations
  // Model status UI with enhanced animations
  const renderModelStatus = () => {
    if (isDownloading) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-4 p-3 bg-blue-900/30 backdrop-blur-sm rounded-lg border border-blue-700/30"
        >
          <motion.div
            animate={{
              y: [0, -5, 0],
              rotate: [0, 5, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          >
            <DownloadCloud className="mb-2 text-blue-300" size={32} />
          </motion.div>
          <div className="text-sm font-medium mb-2 text-blue-200">
            Downloading neural model: {Math.round(downloadProgress)}%
          </div>
          <div className="w-full bg-gray-800/50 rounded-full h-2.5 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400 h-2.5"
              initial={{ width: "0%" }}
              animate={{ width: `${downloadProgress}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              style={{
                backgroundSize: "200% 100%",
                animation: "gradientMove 2s linear infinite",
              }}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={cancelDownload}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            Cancel
          </motion.button>
        </motion.div>
      );
    }

    if (isCheckingModel) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center mb-4 p-3 bg-blue-900/30 backdrop-blur-sm rounded-lg border border-blue-700/30"
        >
          <Loader className="animate-spin mr-2 text-blue-200" size={20} />
          <span className="text-sm text-blue-100">
            Initializing neural pathways...
          </span>
        </motion.div>
      );
    }

    if (!isModelLoaded) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-4 p-3 bg-indigo-900/30 backdrop-blur-sm rounded-lg border border-indigo-700/30"
        >
          <div className="text-sm mb-2 text-indigo-200 flex items-center">
            <Zap className="mr-2" size={16} />
            <span>Neural model not loaded</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadModel}
            className="px-4 py-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-lg shadow-lg hover:shadow-blue-500/20"
            disabled={isDownloading || isCheckingModel}
          >
            Download Neural Engine
          </motion.button>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-red-300 mt-2"
            >
              {error}
            </motion.div>
          )}
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center mb-4 p-2 bg-green-900/20 backdrop-blur-sm rounded-lg text-xs text-green-200 border border-green-700/30"
      >
        <motion.span
          className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
        <span>
          Neural engine active ({platform}) -{" "}
          {(modelSize / (1024 * 1024)).toFixed(1)} MB
        </span>
      </motion.div>
    );
  };

  // Main UI with enhanced animations
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <ParticleBackground />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-gradient-to-br from-black/90 to-blue-950/95"
          >
            <GlowingBorder isProcessing={isProcessing}>
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className="w-[95vw] max-w-2xl mx-auto bg-gradient-to-br from-blue-950 via-black to-purple-900 rounded-2xl shadow-2xl border border-blue-700/40 overflow-hidden mb-24"
                style={{ maxHeight: "80vh" }}
              >
                {/* Header with enhanced animation */}
                <motion.div
                  className="flex justify-between items-center p-4 border-b border-blue-800/40 bg-gradient-to-r from-blue-900/80 to-purple-900/60 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-lg font-bold text-blue-200 tracking-wider flex items-center">
                    <BrainAnimation />
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="ml-2"
                    >
                      Luna AI Assistant
                    </motion.span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowVisualization((prev) => !prev)}
                      className="p-2 rounded-full hover:bg-blue-800/40 transition text-blue-300"
                      title={
                        showVisualization
                          ? "Hide neural visualization"
                          : "Show neural visualization"
                      }
                    >
                      <Brain size={20} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="p-2 rounded-full hover:bg-blue-800/40 transition text-blue-200"
                    >
                      <X size={24} />
                    </motion.button>
                  </div>
                </motion.div>

                {/* Neural visualization */}
                {showVisualization && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-center py-2 px-4 bg-blue-950/30 backdrop-blur-sm"
                  >
                    <NeuralNetworkVisualization isProcessing={isProcessing} />
                  </motion.div>
                )}

                {/* Model Status with enhanced animations */}
                {renderModelStatus()}

                {/* Chat Messages with improved animations */}
                <div
                  className="p-4 overflow-y-auto"
                  style={{ maxHeight: "40vh" }}
                >
                  {messages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-center text-blue-300 py-8"
                    >
                      <motion.div
                        animate={{
                          opacity: [0.7, 1, 0.7],
                          y: [0, -5, 0],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          repeatType: "reverse",
                        }}
                        className="flex justify-center mb-4"
                      >
                        <Brain size={40} className="text-blue-400" />
                      </motion.div>
                      <p className="mb-2">
                        Ask me anything or control your smart home!
                      </p>
                      <p className="text-sm text-blue-400">
                        I'm powered by neural technology
                      </p>
                    </motion.div>
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
                        <MessageBubble
                          message={message}
                          animate={idx === messages.length - 1}
                        />
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area with enhanced animations */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 border-t border-blue-800/40 bg-gradient-to-r from-blue-900/80 to-purple-900/60 backdrop-blur-sm"
                >
                  <form
                    onSubmit={handleSubmit}
                    className="flex items-center gap-2"
                  >
                    {/* Mode Toggle with enhanced animation */}
                    <div className="flex items-center mr-2">
                      <motion.button
                        type="button"
                        onClick={() => setActiveMode("text")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-2 rounded-l-lg transition ${
                          activeMode === "text"
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                            : "bg-blue-900/70 text-blue-300"
                        }`}
                      >
                        <MessageSquare size={20} />
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => setActiveMode("voice")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-2 rounded-r-lg transition ${
                          activeMode === "voice"
                            ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg"
                            : "bg-purple-900/70 text-purple-300"
                        }`}
                      >
                        <Volume2 size={20} />
                      </motion.button>
                    </div>

                    {/* Text Input or Voice Button with enhanced animations */}
                    {activeMode === "text" ? (
                      <>
                        <motion.div
                          className="relative flex-grow"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 20,
                          }}
                        >
                          <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type your message..."
                            className="w-full p-3 rounded-lg bg-blue-950/70 text-blue-100 border border-blue-800/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-blue-400/70 backdrop-blur-sm"
                            disabled={isProcessing || !isModelLoaded}
                          />
                          {inputText.length > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: "100%" }}
                              className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                              style={{
                                scaleX: Math.min(1, inputText.length / 50),
                                transformOrigin: "left",
                              }}
                            />
                          )}
                        </motion.div>
                        <motion.button
                          type="submit"
                          disabled={
                            !inputText.trim() || isProcessing || !isModelLoaded
                          }
                          whileHover={
                            inputText.trim() && !isProcessing && isModelLoaded
                              ? { scale: 1.05 }
                              : {}
                          }
                          whileTap={
                            inputText.trim() && !isProcessing && isModelLoaded
                              ? { scale: 0.95 }
                              : {}
                          }
                          className={`p-3 rounded-lg transition ${
                            !inputText.trim() || isProcessing || !isModelLoaded
                              ? "bg-blue-900/70 text-blue-400"
                              : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/20"
                          }`}
                        >
                          {isProcessing ? (
                            <Loader className="animate-spin" size={20} />
                          ) : (
                            <Send size={20} />
                          )}
                        </motion.button>
                      </>
                    ) : (
                      <div className="flex-grow flex items-center">
                        <motion.button
                          type="button"
                          onMouseDown={handleVoiceStart}
                          onMouseUp={handleVoiceStop}
                          onTouchStart={handleVoiceStart}
                          onTouchEnd={handleVoiceStop}
                          disabled={isProcessing || !isModelLoaded}
                          whileHover={
                            !isProcessing && isModelLoaded
                              ? { scale: 1.02 }
                              : {}
                          }
                          whileTap={
                            !isProcessing && isModelLoaded && isListening
                              ? { scale: 0.98 }
                              : {}
                          }
                          className={`w-full h-12 flex items-center justify-center p-3 rounded-lg transition shadow-lg ${
                            isListening
                              ? "bg-gradient-to-r from-pink-600 to-purple-700 text-white"
                              : isProcessing || !isModelLoaded
                              ? "bg-blue-900/70 text-blue-400"
                              : "bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white"
                          }`}
                        >
                          <motion.div
                            animate={
                              isListening
                                ? {
                                    scale: [1, 1.2, 1],
                                    opacity: [0.7, 1, 0.7],
                                  }
                                : {}
                            }
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="mr-2"
                          >
                            <Mic size={24} />
                          </motion.div>
                          {isListening ? (
                            <EnhancedWaveform
                              waveform={waveform}
                              isActive={isListening}
                            />
                          ) : isProcessing ? (
                            <Loader className="animate-spin" size={20} />
                          ) : (
                            <span>Hold to speak</span>
                          )}
                        </motion.button>
                      </div>
                    )}
                  </form>

                  {/* Transcript display for voice mode with enhanced animation */}
                  <AnimatePresence>
                    {activeMode === "voice" && transcript && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mt-2 text-sm text-blue-200"
                      >
                        <span className="font-medium text-blue-300">
                          You said:
                        </span>{" "}
                        <span className="italic">{transcript}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* AI Status indicator with subtle animation */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isProcessing || isListening ? 1 : 0 }}
                    className="mt-2 flex justify-center"
                  >
                    <div className="text-xs text-blue-300 flex items-center gap-2">
                      {isProcessing && (
                        <motion.div
                          animate={{
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="flex items-center"
                        >
                          <Brain size={12} className="mr-1" />
                          <span>Processing...</span>
                        </motion.div>
                      )}
                      {isListening && !isProcessing && (
                        <motion.div
                          animate={{
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="flex items-center"
                        >
                          <Volume2 size={12} className="mr-1" />
                          <span>Listening...</span>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </GlowingBorder>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AIOverlay;
