import { useState, useCallback } from 'react';
import { isPlatform } from '@ionic/react';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize Talkify TTS
  const initTalkify = useCallback(() => {
    if (!window.talkify) {
      const script = document.createElement('script');
      script.src = 'https://talkify.net/talkify.min.js';
      script.async = true;
      document.body.appendChild(script);
      
      return new Promise((resolve) => {
        script.onload = () => {
          resolve();
        };
      });
    }
    return Promise.resolve();
  }, []);
  
  const speak = useCallback(async (text) => {
    if (!text) return;
    
    setError(null);
    setIsSpeaking(true);
    
    try {
      if (isPlatform('capacitor')) {
        // Mobile implementation using Capacitor
        await TextToSpeech.speak({
          text,
          lang: 'en-US',
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient'
        });
        
        // Since Capacitor doesn't have an event for speech completion,
        // we'll estimate when it's done based on text length
        const estimatedDuration = text.length * 80; // ~80ms per character
        setTimeout(() => {
          setIsSpeaking(false);
        }, estimatedDuration);
      } else {
        // Web implementation using Talkify
        await initTalkify();
        
        if (window.talkify) {
          const player = new window.talkify.TtsPlayer();
          player.setRate(1);
          player.setVolume(1);
          
          // Use female voice
          const availableVoices = window.talkify.voices();
          const femaleVoice = availableVoices.find(v => v.gender === 'female');
          
          if (femaleVoice) {
            player.setVoice(femaleVoice);
          }
          
          player.addEventListener('ended', () => {
            setIsSpeaking(false);
          });
          
          player.playText(text);
        } else {
          // Fallback to browser's TTS if Talkify fails to load
          const utterance = new SpeechSynthesisUtterance(text);
          
          // Try to find a female voice
          const voices = window.speechSynthesis.getVoices();
          const femaleVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('female') || 
            voice.name.includes('Google UK English Female')
          );
          
          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }
          
          utterance.rate = 1;
          utterance.pitch = 1;
          utterance.volume = 1;
          
          utterance.onend = () => {
            setIsSpeaking(false);
          };
          
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (err) {
      setError(err.message);
      setIsSpeaking(false);
      console.error('TTS error:', err);
    }
  }, [initTalkify]);
  
  const stop = useCallback(() => {
    if (isPlatform('capacitor')) {
      TextToSpeech.stop();
    } else {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);
  
  return {
    speak,
    stop,
    isSpeaking,
    error
  };
};