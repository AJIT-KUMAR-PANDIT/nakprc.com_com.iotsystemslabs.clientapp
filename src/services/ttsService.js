import { useState, useCallback, useRef } from 'react';
import { isPlatform } from '@ionic/react';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const utteranceRef = useRef(null);

  const speak = useCallback(async (text) => {
    if (!text) return;
    setError(null);
    setIsSpeaking(true);

    if (isPlatform('capacitor')) {
      // Mobile implementation using Capacitor
      await TextToSpeech.speak({
        text,
        lang: 'hi-IN',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient'
      });
      const estimatedDuration = text.length * 80;
      setTimeout(() => {
        setIsSpeaking(false);
      }, estimatedDuration);
      return;
    }

    // --- Web: Use browser TTS robustly ---
    const synth = window.speechSynthesis;
    let voices = synth.getVoices();

    // If voices are not loaded yet, wait for them
    if (!voices || voices.length === 0) {
      await new Promise((resolve) => {
        window.speechSynthesis.onvoiceschanged = () => {
          voices = synth.getVoices();
          resolve();
        };
      });
    }

    // Prefer Indian female, then any female, then any voice
    let selectedVoice =
      voices.find(v => (v.lang === 'hi-IN' || v.lang === 'en-IN') && v.name.toLowerCase().includes('female')) ||
      voices.find(v => v.name.toLowerCase().includes('female')) ||
      voices[0];

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice?.lang || 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = (e) => {
      setIsSpeaking(false);
      setError(e.error || 'TTS error');
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
  }, []);

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
    error,
    // The following are no-ops for browser TTS but kept for API compatibility
    piperReady: true,
    piperVoices: [],
    selectedVoice: '',
    changeVoice: () => false
  };
};