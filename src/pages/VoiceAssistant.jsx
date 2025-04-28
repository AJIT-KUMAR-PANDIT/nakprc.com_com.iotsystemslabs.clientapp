import React, { useState } from "react";
import { Mic, Loader, X } from "lucide-react";
import AIOverlay from "../components/AIOverlay";

const VoiceAssistant = ({ isBlackBg, label }) => {
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const handleStartListening = () => {
    setIsLoading(true);

    // Simulate AI processing delay
    setTimeout(() => {
      setIsListening(true);
      setIsLoading(false);
    }, 1500);
  };

  const handleStopListening = () => {
    setIsListening(false);
  };

  const startListening = async () => {
    handleStartListening();
  };

  const stopListening = async () => {
    handleStopListening();
  };

  const handleListen = async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  const openOverlay = () => {
    setOverlayOpen(true);
  };

  const closeOverlay = () => {
    setOverlayOpen(false);
    if (isListening) {
      stopListening();
    }
  };

  return (
    <div className={`voice-assistant-container ${isBlackBg ? "black-bg" : ""}`}>
      <div className="voice-assistant-controls">
        {!isListening ? (
          <div
            className={`voice-assistant-btn ${
              isBlackBg ? "bg-white text-black" : "bg-black text-white"
            }`}
            onClick={openOverlay}
          >
            {isLoading ? (
              <Loader className="animate-spin text-blue-500" size={36} />
            ) : (
              <Mic size={36} />
            )}
            <span className="tooltip">AI Assistant</span>
          </div>
        ) : (
          <div
            className={`voice-assistant-active ${
              isBlackBg ? "bg-red-400 text-white" : "bg-red-600 text-white"
            }`}
            onClick={handleStopListening}
          >
            <X size={36} />
            <span className="tooltip">Stop Listening</span>
          </div>
        )}
      </div>

      {/* Dynamic Label */}
      <span
        className={`mt-2 text-sm font-bold ${
          isBlackBg ? "text-white" : "text-black"
        }`}
      >
        {label || "AI Voice"}
      </span>

      {/* Add the AI Overlay */}
      <AIOverlay
        isOpen={overlayOpen}
        onClose={closeOverlay}
        onListen={handleListen}
        isListening={isListening}
      />
    </div>
  );
};

export default VoiceAssistant;
