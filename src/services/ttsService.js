import { useState, useCallback, useEffect } from 'react';
import { isPlatform } from '@ionic/react';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [piperReady, setPiperReady] = useState(false);
  const [piperVoices, setPiperVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('indic_female');
  const [piperInstance, setPiperInstance] = useState(null);
  
  // Initialize Piper TTS with direct script loading instead of npm package
  const initPiper = useCallback(async () => {
    if (!window.piper) {
      try {
        console.log('Initializing custom Piper TTS implementation');
        
        // Load the Piper script
        const script = document.createElement('script');
        script.src = '/models/piper/piper-worker.js';
        script.async = true;
        document.body.appendChild(script);
        
        return new Promise((resolve) => {
          script.onload = async () => {
            try {
              // Create a simple API wrapper for Piper
              window.piper = {
                initialized: false,
                worker: null,
                audioContext: null,
                
                initialize: async function() {
                  if (this.initialized) return true;
                  
                  // Create Web Worker for Piper
                  this.worker = new Worker('/models/piper/piper-worker.js');
                  this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                  
                  // Initialize the worker
                  return new Promise((resolve, reject) => {
                    this.worker.onmessage = (e) => {
                      if (e.data.type === 'initialized') {
                        this.initialized = true;
                        resolve(true);
                      } else if (e.data.type === 'error') {
                        reject(new Error(e.data.message));
                      }
                    };
                    
                    this.worker.postMessage({
                      type: 'initialize',
                      baseUrl: '/models/piper'
                    });
                  });
                },
                
                listVoices: async function() {
                  if (!this.initialized) await this.initialize();
                  
                  return new Promise((resolve, reject) => {
                    this.worker.onmessage = (e) => {
                      if (e.data.type === 'voices') {
                        resolve(e.data.voices);
                      } else if (e.data.type === 'error') {
                        reject(new Error(e.data.message));
                      }
                    };
                    
                    this.worker.postMessage({ type: 'listVoices' });
                  });
                },
                
                speakToAudioElement: async function(text, options = {}) {
                  if (!this.initialized) await this.initialize();
                  
                  return new Promise((resolve, reject) => {
                    const audioElement = options.audioElement || new Audio();
                    
                    this.worker.onmessage = (e) => {
                      if (e.data.type === 'audio') {
                        // Convert ArrayBuffer to Blob
                        const blob = new Blob([e.data.audio], { type: 'audio/wav' });
                        const url = URL.createObjectURL(blob);
                        
                        // Set up audio element
                        audioElement.src = url;
                        audioElement.onended = () => {
                          URL.revokeObjectURL(url);
                          if (options.onEnd) options.onEnd();
                          resolve();
                        };
                        
                        audioElement.onerror = (err) => {
                          URL.revokeObjectURL(url);
                          reject(err);
                        };
                        
                        audioElement.play();
                      } else if (e.data.type === 'error') {
                        reject(new Error(e.data.message));
                      }
                    };
                    
                    this.worker.postMessage({
                      type: 'speak',
                      text: text,
                      voiceName: options.voiceName || 'indic_female'
                    });
                  });
                },
                
                stop: function() {
                  if (this.worker) {
                    this.worker.postMessage({ type: 'stop' });
                  }
                },
                
                cleanup: function() {
                  if (this.worker) {
                    this.worker.terminate();
                    this.worker = null;
                  }
                  
                  if (this.audioContext) {
                    this.audioContext.close();
                    this.audioContext = null;
                  }
                  
                  this.initialized = false;
                }
              };
              
              // Initialize the Piper instance
              await window.piper.initialize();
              
              // Define default voices if worker doesn't provide them
              const defaultVoices = [
                {
                  name: 'indic_female',
                  language: 'hi-IN',
                  gender: 'female',
                  description: 'Indian Female Voice'
                },
                {
                  name: 'english_indian_female',
                  language: 'en-IN',
                  gender: 'female',
                  description: 'English (Indian) Female Voice'
                }
              ];
              
              // Get available voices
              let voices;
              try {
                voices = await window.piper.listVoices();
                if (!voices || voices.length === 0) {
                  voices = defaultVoices;
                }
              } catch (err) {
                console.warn('Error listing voices, using defaults:', err);
                voices = defaultVoices;
              }
              
              setPiperVoices(voices);
              setPiperInstance(window.piper);
              
              // Find Indian female voice if available
              const indicFemaleVoice = voices.find(v => 
                (v.language === 'hi-IN' || v.language === 'en-IN') && 
                v.name.toLowerCase().includes('female')
              );
              
              if (indicFemaleVoice) {
                setSelectedVoice(indicFemaleVoice.name);
              }
              
              console.log('Custom Piper TTS initialized with voices:', voices);
              setPiperReady(true);
              resolve(true);
            } catch (err) {
              console.error('Failed to initialize custom Piper:', err);
              setError('Failed to initialize Piper TTS');
              resolve(false);
            }
          };
          
          script.onerror = () => {
            console.error('Failed to load Piper script');
            setError('Failed to load Piper TTS script');
            resolve(false);
          };
        });
      } catch (err) {
        console.error('Error setting up custom Piper:', err);
        setError('Error setting up Piper TTS');
        return false;
      }
    }
    return window.piper && window.piper.initialized;
  }, []);
  
  // Load Piper on component mount
  useEffect(() => {
    initPiper();
    
    // Cleanup on unmount
    return () => {
      if (window.piper) {
        window.piper.cleanup();
      }
    };
  }, [initPiper]);
  
  const speak = useCallback(async (text) => {
    if (!text) return;
    
    setError(null);
    setIsSpeaking(true);
    
    try {
      if (isPlatform('capacitor')) {
        // Mobile implementation using Capacitor
        await TextToSpeech.speak({
          text,
          lang: 'hi-IN', // Use Hindi-India if available
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
        // Web implementation using custom Piper TTS
        if (!window.piper || !window.piper.initialized) {
          await initPiper();
        }
        
        if (window.piper && window.piper.initialized) {
          try {
            // Use custom Piper TTS implementation
            console.log(`Speaking text with custom Piper using voice: ${selectedVoice}`);
            
            // Play the audio with the selected voice
            await window.piper.speakToAudioElement(text, {
              voiceName: selectedVoice,
              onEnd: () => {
                setIsSpeaking(false);
              }
            });
            
            // Fallback in case onEnd doesn't fire
            setTimeout(() => {
              setIsSpeaking(false);
            }, text.length * 100 + 1000);
          } catch (piperErr) {
            console.error('Piper TTS error:', piperErr);
            fallbackToWebSpeech(text);
          }
        } else {
          // Fallback to browser's TTS if Piper fails to load
          fallbackToWebSpeech(text);
        }
      }
    } catch (err) {
      setError(err.message);
      setIsSpeaking(false);
      console.error('TTS error:', err);
      
      // Try fallback as last resort
      try {
        fallbackToWebSpeech(text);
      } catch (fallbackErr) {
        console.error('Fallback TTS also failed:', fallbackErr);
      }
    }
  }, [initPiper, selectedVoice]);
  
  // Fallback to Web Speech API - remains the same
  const fallbackToWebSpeech = (text) => {
    console.log('Falling back to Web Speech API');
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find an Indian female voice
    const voices = window.speechSynthesis.getVoices();
    const indianFemaleVoice = voices.find(voice => 
      (voice.lang === 'hi-IN' || voice.lang === 'en-IN') && 
      (voice.name.toLowerCase().includes('female'))
    );
    
    // Fallback to any female voice
    const femaleVoice = voices.find(voice => 
      voice.name.toLowerCase().includes('female')
    );
    
    if (indianFemaleVoice) {
      utterance.voice = indianFemaleVoice;
    } else if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    utterance.lang = 'hi-IN'; // Prefer Hindi if available
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };
  
  const stop = useCallback(() => {
    if (isPlatform('capacitor')) {
      TextToSpeech.stop();
    } else if (window.piper && window.piper.initialized) {
      // Stop custom Piper TTS
      window.piper.stop();
      
      // Also stop any Web Speech API speech as fallback
      window.speechSynthesis.cancel();
    } else {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);
  
  // Change voice
  const changeVoice = useCallback((voiceName) => {
    if (piperVoices.some(v => v.name === voiceName)) {
      setSelectedVoice(voiceName);
      return true;
    }
    return false;
  }, [piperVoices]);
  
  return {
    speak,
    stop,
    isSpeaking,
    error,
    piperReady,
    piperVoices,
    selectedVoice,
    changeVoice
  };
};