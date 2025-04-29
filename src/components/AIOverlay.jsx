// AIOverlay.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import "../styles/ai-overlay.css";
import { useLLM } from "../services/llmService";
import { useTTS } from "../services/ttsService";
import { useSpeechRecognition } from "../services/speechRecognitionService";

const AIOverlay = ({ isOpen, onClose, onListen, isListening }) => {
  const [animationComplete, setAnimationComplete] = useState(false);
  const [audioVisualizer, setAudioVisualizer] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const listeningRef = useRef(isListening);
  const debounceTimer = useRef(null);

  useEffect(() => {
    listeningRef.current = isListening;
  }, [isListening]);

  const { speak, isSpeaking } = useTTS();
  const {
    generateResponse,
    isModelLoaded,
    isLoading,
    downloadModel,
    downloadProgress,
    statusMessage,
    isCheckingModel,
    redownloadModel,
    error,
    checkModelExists,
  } = useLLM();

  const {
    startListening: startSpeechRecognition,
    stopListening: stopSpeechRecognition,
    transcript: recognizedText,
  } = useSpeechRecognition();

  const processCommand = useCallback(
    async (text) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setTranscript(text);

      await new Promise((resolve) => setTimeout(resolve, 3000));

      try {
        const llmResponse = await generateResponse(text);
        let systemUrl = null;
        let userResponse = null;
        if (llmResponse) {
          const systemMatch = llmResponse.match(/^system:\s*(.+)$/m);
          if (systemMatch) {
            systemUrl = systemMatch[1].trim();
          }
          const userMatch = llmResponse.match(/^user:\s*(.+)$/m);
          if (userMatch) {
            userResponse = userMatch[1].trim();
          }
        }

        if (systemUrl) {
          try {
            await fetch(systemUrl);
          } catch (err) {
            console.error("Device control API error:", err);
          }
        }

        if (userResponse) {
          setResponse(userResponse);
          await speak(userResponse);
        } else {
          setResponse(llmResponse);
          await speak(llmResponse);
        }
      } catch (error) {
        console.error("LLM error:", error);
        const errorResponse = "Sorry, I had trouble processing your request";
        setResponse(errorResponse);
        await speak(errorResponse);
      }

      setIsProcessing(false);
    },
    [isProcessing, generateResponse, speak]
  );

  useEffect(() => {
    if (recognizedText) {
      console.log("Speech recognition text:", recognizedText);
    }

    if (recognizedText && recognizedText.toLowerCase().includes("luna")) {
      if (!isOpen) {
        onListen();
      }
    }

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
      }, 1000);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [recognizedText, isOpen, isListening, onListen, processCommand]);

  useEffect(() => {
    if (isOpen) {
      setAnimationComplete(false);
      const timer = setTimeout(() => {
        setAnimationComplete(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isListening) {
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
  }, [isListening, startSpeechRecognition, stopSpeechRecognition]);

  useEffect(() => {
    if (isOpen) {
      checkModelExists();
    }
  }, [isOpen, checkModelExists]);

  if (!isOpen) return null;

  return (
    <div className="ai-overlay enhanced-glass">
      <div className="ai-overlay-background enhanced-glass"></div>
      <div className={`ai-overlay-content animated-entrance`}>
        <button className="ai-close-button enhanced-close" onClick={onClose}>
          <span>×</span>
        </button>
        <div className="ai-circle-container enhanced-shadow">
          <div className="ai-outer-circle enhanced-glow"></div>
          <div className="ai-middle-circle enhanced-glow"></div>
          <div className="ai-inner-circle enhanced-glow"></div>
          <div className="ai-core enhanced-core-glow">
            <div
              className={`ai-core-pulse ${
                isListening || isSpeaking ? "pulse-active" : ""
              }`}
            ></div>
          </div>
          {animationComplete && (
            <div className="ai-status-text enhanced-status-text">
              {isProcessing
                ? "Processing..."
                : isSpeaking
                ? "Speaking..."
                : isListening
                ? "Listening..."
                : "Ready"}
            </div>
          )}
        </div>
        <div className="ai-visualizer-container">
          {audioVisualizer.map((height, index) => (
            <div
              key={index}
              className="ai-visualizer-bar enhanced-bar"
              style={{ height: `${height}%` }}
            ></div>
          ))}
        </div>
        {transcript && (
          <div className="ai-transcript">
            <p>You said: {transcript}</p>
          </div>
        )}
        {response && (
          <div className="ai-response">
            <p>Luna: {response}</p>
          </div>
        )}
        <button
          className={`ai-action-button enhanced-action ${
            isListening ? "listening" : ""
          }`}
          onClick={onListen}
          disabled={!isModelLoaded || isLoading || isCheckingModel}
        >
          {isListening ? "Stop" : "Listen"}
        </button>
        {!isModelLoaded && !isCheckingModel && (
          <div className="ai-model-status">
            {isLoading ? (
              <>
                <p>{statusMessage}</p>
                <div className="model-download-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {Math.round(downloadProgress)}% Downloaded
                  </div>
                </div>
                <p className="download-info">Downloading AI model (150MB)...</p>
              </>
            ) : (
              <>
                <p>AI model required for voice assistant</p>
                <button
                  className="model-download-button"
                  onClick={downloadModel}
                  disabled={isLoading}
                >
                  Download Now
                </button>
              </>
            )}
          </div>
        )}
        {isCheckingModel && !isModelLoaded && (
          <div className="ai-model-status">
            <p>Checking for existing model...</p>
          </div>
        )}
        <div className="ai-reset-container">
          <p style={{ color: "#ff0000", fontWeight: "bold" }}>
            Status: {statusMessage}
          </p>
          {error && (
            <div style={{ color: "#ff0000", fontWeight: "bold" }}>{error}</div>
          )}
          <button
            onClick={redownloadModel}
            disabled={isLoading}
            className="ai-reset-button enhanced-reset"
          >
            Reset AI Model
          </button>
        </div>
        <div className="ai-tech-elements">
          <div className="ai-tech-circle top-left"></div>
          <div className="ai-tech-circle top-right"></div>
          <div className="ai-tech-circle bottom-left"></div>
          <div className="ai-tech-circle bottom-right"></div>
          <div className="ai-tech-line horizontal"></div>
          <div className="ai-tech-line vertical"></div>
        </div>
      </div>
    </div>
  );
};

export default AIOverlay;
