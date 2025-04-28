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

  const { speak, isSpeaking } = useTTS();
  const {
    generateResponse,
    isModelLoaded,
    isLoading,
    downloadModel,
    modelProgress,
    statusMessage,
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
  useEffect(() => {
    if (recognizedText && recognizedText.toLowerCase().includes("luna")) {
      if (!isOpen) {
        // If overlay is not open and wake word detected, open it
        onListen(); // This will start listening
      }
    }

    // Process command if we're listening and have text
    if (
      isListening &&
      recognizedText &&
      !recognizedText.toLowerCase().includes("luna")
    ) {
      setTranscript(recognizedText);
      processCommand(recognizedText);
    }
  }, [recognizedText, isOpen, isListening]);

  // Process the user command
  const processCommand = async (text) => {
    if (isProcessing) return;

    setIsProcessing(true);

    // Check if it's a smart home command
    const smartHomeRegex =
      /(turn|switch|put|set) (on|off) (the )?([\w\s]+) (in|at) (the )?([\w\s]+)/i;
    const match = text.match(smartHomeRegex);

    if (match) {
      const action = match[2]; // on/off
      const device = match[4].trim(); // device name
      const room = match[7].trim(); // room name

      try {
        // Make API call to control device
        const apiUrl = `http://nakprciotsystemslabs.local/${encodeURIComponent(
          room
        )}/${encodeURIComponent(device)}/${action}`;
        const result = await fetch(apiUrl);

        if (result.ok) {
          const responseText = `${device} in ${room} turned ${action}`;
          setResponse(responseText);
          speak(responseText);
        } else {
          throw new Error("Failed to control device");
        }
      } catch (error) {
        console.error("Smart home control error:", error);
        const errorResponse = `Sorry, I couldn't control the ${device} in ${room}`;
        setResponse(errorResponse);
        speak(errorResponse);
      }
    } else {
      // Not a smart home command, use LLM
      try {
        const llmResponse = await generateResponse(text);
        setResponse(llmResponse);
        speak(llmResponse);
      } catch (error) {
        console.error("LLM error:", error);
        const errorResponse = "Sorry, I had trouble processing your request";
        setResponse(errorResponse);
        speak(errorResponse);
      }
    }

    setIsProcessing(false);
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

        <button
          className={`ai-action-button enhanced-action ${
            isListening ? "listening" : ""
          }`}
          onClick={onListen}
          disabled={!isModelLoaded && !isLoading}
        >
          {isListening ? "Stop" : "Listen"}
        </button>

        {!isModelLoaded && (
          <div className="ai-model-status">
            {isLoading ? (
              <>
                <p>{statusMessage}</p>
                <div className="model-download-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${modelProgress}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">{modelProgress}%</div>
                </div>
                <p className="download-info">
                  Please wait while the AI model downloads...
                </p>
              </>
            ) : (
              <>
                <p>AI model needs to be downloaded</p>
                <button
                  className="model-download-button"
                  onClick={downloadModel}
                  disabled={isLoading}
                >
                  Download Model
                </button>
                <p className="download-info">
                  This will download approximately 250MB of data
                </p>
              </>
            )}
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
