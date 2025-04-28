import { useState, useEffect, useCallback } from 'react';
import { isPlatform } from '@ionic/react';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize speech recognition based on platform
  useEffect(() => {
    if (isPlatform('capacitor')) {
      // For mobile using Capacitor
      SpeechRecognition.requestPermissions();
    }
  }, []);
  
  const startListening = useCallback(async () => {
    setTranscript('');
    setError(null);
    
    try {
      if (isPlatform('capacitor')) {
        // Mobile implementation using Capacitor
        setIsListening(true);
        
        SpeechRecognition.start({
          language: 'en-US',
          maxResults: 1,
          prompt: 'Speak now',
          partialResults: true,
          popup: false,
        });
        
        SpeechRecognition.addListener('partialResults', (data) => {
          if (data.matches && data.matches.length > 0) {
            setTranscript(data.matches[0]);
          }
        });
        
        SpeechRecognition.addListener('results', (data) => {
          if (data.matches && data.matches.length > 0) {
            setTranscript(data.matches[0]);
          }
          setIsListening(false);
        });
      } else {
        // Web implementation using Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
          throw new Error('Speech recognition not supported in this browser');
        }
        
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onstart = () => {
          setIsListening(true);
        };
        
        recognition.onresult = (event) => {
          const current = event.resultIndex;
          const result = event.results[current];
          const text = result[0].transcript;
          setTranscript(text);
        };
        
        recognition.onerror = (event) => {
          setError(event.error);
          setIsListening(false);
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognition.start();
        window.recognition = recognition; // Store reference to stop later
      }
    } catch (err) {
      setError(err.message);
      console.error('Speech recognition error:', err);
    }
  }, []);
  
  const stopListening = useCallback(() => {
    if (isPlatform('capacitor')) {
      SpeechRecognition.stop();
      SpeechRecognition.removeAllListeners();
    } else if (window.recognition) {
      window.recognition.stop();
    }
    setIsListening(false);
  }, []);
  
  return {
    transcript,
    isListening,
    error,
    startListening,
    stopListening
  };
};