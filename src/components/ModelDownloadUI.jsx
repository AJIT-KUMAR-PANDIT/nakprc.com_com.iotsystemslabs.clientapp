import React from 'react';
import { useLLM } from '../services/llmService';
import '../styles/model-download.css';

const ModelDownloadUI = () => {
  const { 
    isModelLoaded, 
    isLoading, 
    error, 
    modelProgress, 
    downloadModel 
  } = useLLM();

  if (isModelLoaded) {
    return null; // Don't show if model is already loaded
  }

  return (
    <div className="model-download-container">
      <div className="model-download-card">
        <h2>AI Model Required</h2>
        <p>To use the voice assistant, you need to download the AI model (approximately 500MB).</p>
        
        {error && (
          <div className="model-download-error">
            <p>Error: {error}</p>
            <p>Please try again or check your internet connection.</p>
          </div>
        )}
        
        {isLoading ? (
          <div className="model-download-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${modelProgress}%` }}
              ></div>
            </div>
            <p>{modelProgress}% Downloaded</p>
          </div>
        ) : (
          <button 
            className="model-download-button"
            onClick={downloadModel}
            disabled={isLoading}
          >
            Download AI Model
          </button>
        )}
        
        <div className="model-download-info">
          <p><strong>Model:</strong> Qwen 0.5B (Optimized)</p>
          <p><strong>Size:</strong> ~500MB</p>
          <p><strong>Features:</strong> Voice control, smart home integration, multilingual support</p>
        </div>
      </div>
    </div>
  );
};

export default ModelDownloadUI;