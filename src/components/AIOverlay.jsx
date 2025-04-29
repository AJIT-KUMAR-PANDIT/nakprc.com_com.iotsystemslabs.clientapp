import React, { useState, useEffect, useRef } from "react";
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

  const { speak, isSpeaking, onEnd: onTTSEnd } = useTTS(); // <-- Add onEnd if your TTS hook supports it
  const {
    generateResponse,
    isModelLoaded,
    isLoading,
    downloadModel,
    downloadProgress,
    statusMessage,
    isCheckingModel, // Add this destructuring
  } = useLLM();
  const {
    startListening: startSpeechRecognition,
    stopListening: stopSpeechRecognition,
    transcript: recognizedText,
    isListening: isRecognizing,
  } = useSpeechRecognition();

  // Reference to track if we're in listening mode
  const listeningRef = useRef(isListening);

  useEffect(() => {
    listeningRef.current = isListening;
  }, [isListening]);

  // Handle wake word detection
  // Debounce timer ref
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (recognizedText) {
      console.log("Speech recognition text:", recognizedText);
    }

    if (recognizedText && recognizedText.toLowerCase().includes("luna")) {
      if (!isOpen) {
        onListen();
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

    // Cleanup timer on unmount or recognizedText change
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [recognizedText, isOpen, isListening]);

  // Process the user command
  const processCommand = async (text) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTranscript(text);

    // Wait for 3 seconds before sending to LLM (pause after user finishes speaking)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      // Always send the full sentence to LLM
      const llmResponse = await generateResponse(text);

      // Extract system and user lines
      let systemUrl = null;
      let userResponse = null;
      if (llmResponse) {
        // Match lines like: system: http://nakprciotsystemslabs.local/...
        const systemMatch = llmResponse.match(/^system:\s*(.+)$/m);
        if (systemMatch) {
          systemUrl = systemMatch[1].trim();
        }
        // Match lines like: user: ...
        const userMatch = llmResponse.match(/^user:\s*(.+)$/m);
        if (userMatch) {
          userResponse = userMatch[1].trim();
        }
      }

      // If system URL is present, call the device control API
      if (systemUrl) {
        try {
          const result = await fetch(systemUrl);
          // Optionally, you can check result.ok and handle errors
        } catch (err) {
          console.error("Device control API error:", err);
        }
      }

      // If user response is present, speak it
      if (userResponse) {
        setResponse(userResponse);
        await speak(userResponse);
      } else {
        // fallback: speak the whole LLM response
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
  };

  // Helper to speak and wait for TTS to finish
  const speakAndWait = (text) => {
    return new Promise((resolve) => {
      speak(text);
      // If your TTS hook provides an onEnd callback, use it:
      if (typeof onTTSEnd === 'function') {
        onTTSEnd(resolve);
      } else {
        // Fallback: poll isSpeaking
        const interval = setInterval(() => {
          if (!isSpeaking) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      }
    });
  };

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
  }, [isListening]);

  if (!isOpen) return null;

  // Inside your component where you handle the response
  const handleUserInput = async (userInput) => {
    try {
      setIsProcessing(true);
      const aiResponse = await generateResponse(userInput);
      setResponse(aiResponse);

      // Make sure to call the TTS function with the response
      console.log("Calling TTS with response:", aiResponse);
      await speak(aiResponse);
    } catch (error) {
      console.error("Error processing input:", error);
    } finally {
      setIsProcessing(false);
    }
  };

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

        {/* Update the button disable logic */}
        <button
          className={`ai-action-button enhanced-action ${
            isListening ? "listening" : ""
          }`}
          onClick={onListen}
          disabled={!isModelLoaded} // Only enable when model is loaded
        >
          {isListening ? "Stop" : "Listen"}
        </button>

        {/* Model download/progress UI */}
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
                    {Math.round(downloadProgress)}%
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
