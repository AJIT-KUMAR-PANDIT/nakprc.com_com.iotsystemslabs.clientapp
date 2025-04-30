import { useState, useEffect, useCallback, useRef } from "react";
import { isPlatform } from "@ionic/react";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

/**
 * Custom hook for speech recognition with improved reliability
 * Supports both web browsers and Capacitor mobile apps
 */
export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Request permissions on component mount for mobile
    if (isPlatform("capacitor")) {
      SpeechRecognition.requestPermissions().catch((err) => {
        console.error("Permission error:", err);
        setError("Microphone permission denied");
      });
    }

    // Cleanup function
    return () => {
      if (recognitionRef.current && !isPlatform("capacitor")) {
        recognitionRef.current.abort();
      } else if (isPlatform("capacitor")) {
        SpeechRecognition.stop();
        SpeechRecognition.removeAllListeners();
      }
    };
  }, []);

  const startListening = useCallback(async (options = {}) => {
    const {
      language = "en-US",
      continuous = true,
      interimResults = true,
      maxAlternatives = 1,
      onResult = null,
      onEnd = null,
    } = options;

    setTranscript("");
    setError(null);

    try {
      if (isPlatform("capacitor")) {
        // Mobile implementation
        setIsListening(true);

        SpeechRecognition.start({
          language,
          maxResults: maxAlternatives,
          prompt: "Speak now",
          partialResults: interimResults,
          popup: false,
        });

        SpeechRecognition.addListener("partialResults", (data) => {
          if (data.matches && data.matches.length > 0) {
            const text = data.matches[0];
            setTranscript(text);
            if (onResult) onResult(text, true); // true = interim
          }
        });

        SpeechRecognition.addListener("results", (data) => {
          if (data.matches && data.matches.length > 0) {
            const text = data.matches[0];
            setTranscript(text);
            if (onResult) onResult(text, false); // false = final
          }
          setIsListening(false);
          if (onEnd) onEnd();
        });

        // Add error handling for Capacitor
        SpeechRecognition.addListener("error", (error) => {
          console.error("Speech recognition error:", error);
          setError(error.message || "Speech recognition failed");
          setIsListening(false);
          if (onEnd) onEnd(error);
        });
      } else {
        // Web implementation
        const SpeechRecognitionAPI =
          window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
          throw new Error("Speech recognition not supported in this browser");
        }

        // Stop any existing recognition
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }

        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;

        recognition.lang = language;
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.maxAlternatives = maxAlternatives;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result[0].transcript;

            if (result.isFinal) {
              finalTranscript += text;
              if (onResult) onResult(text, false); // false = final
            } else {
              interimTranscript += text;
              if (onResult) onResult(text, true); // true = interim
            }
          }

          // Set the transcript based on what we have
          const newTranscript = finalTranscript || interimTranscript;
          if (newTranscript) {
            setTranscript((prev) =>
              continuous ? prev + finalTranscript : newTranscript
            );
          }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setError(event.error || "Speech recognition failed");
          setIsListening(false);
          if (onEnd) onEnd(event);
        };

        recognition.onend = () => {
          setIsListening(false);
          if (onEnd) onEnd();
        };

        recognition.start();
      }
    } catch (err) {
      setError(err.message || "Speech recognition failed to start");
      console.error("Speech recognition error:", err);
      if (onEnd) onEnd(err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (isPlatform("capacitor")) {
      SpeechRecognition.stop();
      SpeechRecognition.removeAllListeners();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return {
    transcript,
    isListening,
    error,
    startListening,
    stopListening,
    reset: () => setTranscript(""),
  };
};

/**
 * Custom hook for text-to-speech with improved reliability
 * Supports both web browsers and Capacitor mobile apps
 */
export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [isReady, setIsReady] = useState(false);
  const utteranceRef = useRef(null);

  // Initialize and load voices
  useEffect(() => {
    if (!isPlatform("capacitor")) {
      // For web, initialize speech synthesis and voices
      const synth = window.speechSynthesis;

      const loadVoices = () => {
        const availableVoices = synth.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);

          // Default voice selection logic
          let defaultVoice =
            availableVoices.find(
              (v) => v.lang === "hi-IN" || v.lang === "en-IN"
            ) ||
            availableVoices.find((v) => v.lang.startsWith("en")) ||
            availableVoices[0];

          setSelectedVoice(defaultVoice?.name || "");
          setIsReady(true);
        }
      };

      // Chrome needs the onvoiceschanged event
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
      }

      // Try loading voices immediately
      loadVoices();

      // Cleanup
      return () => {
        if (utteranceRef.current) {
          synth.cancel();
        }
      };
    } else {
      // For mobile, just mark as ready since Capacitor handles voices internally
      setIsReady(true);
    }
  }, []);

  const speak = useCallback(
    async (text, options = {}) => {
      if (!text) return;

      const {
        lang = "en-US",
        rate = 1.0,
        pitch = 1.0,
        volume = 1.0,
        onStart = null,
        onEnd = null,
        onError = null,
        voiceName = selectedVoice,
      } = options;

      setError(null);
      setIsSpeaking(true);
      if (onStart) onStart();

      try {
        if (isPlatform("capacitor")) {
          // Mobile implementation using Capacitor
          await TextToSpeech.speak({
            text,
            lang,
            rate,
            pitch,
            volume,
            category: "ambient",
          });

          // Capacitor TTS doesn't provide callbacks, so estimate duration
          const estimatedDuration = text.length * 80; // ~80ms per character
          setTimeout(() => {
            setIsSpeaking(false);
            if (onEnd) onEnd();
          }, estimatedDuration);
        } else {
          // Web implementation
          const synth = window.speechSynthesis;

          // Cancel any ongoing speech
          synth.cancel();

          const utterance = new SpeechSynthesisUtterance(text);

          // Find the requested voice if specified
          if (voiceName) {
            const voice = voices.find((v) => v.name === voiceName);
            if (voice) utterance.voice = voice;
          }

          utterance.lang = lang;
          utterance.rate = rate;
          utterance.pitch = pitch;
          utterance.volume = volume;

          utterance.onstart = () => {
            setIsSpeaking(true);
            if (onStart) onStart();
          };

          utterance.onend = () => {
            setIsSpeaking(false);
            if (onEnd) onEnd();
          };

          utterance.onerror = (e) => {
            console.error("TTS error:", e);
            setIsSpeaking(false);
            setError(e.error || "TTS error");
            if (onError) onError(e);
          };

          utteranceRef.current = utterance;
          synth.speak(utterance);
        }
      } catch (err) {
        console.error("TTS error:", err);
        setIsSpeaking(false);
        setError(err.message || "TTS failed");
        if (onError) onError(err);
      }
    },
    [selectedVoice, voices]
  );

  const stop = useCallback(() => {
    if (isPlatform("capacitor")) {
      TextToSpeech.stop();
    } else {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const changeVoice = useCallback(
    (voiceName) => {
      if (voices.some((v) => v.name === voiceName)) {
        setSelectedVoice(voiceName);
        return true;
      }
      return false;
    },
    [voices]
  );

  return {
    speak,
    stop,
    isSpeaking,
    error,
    voices,
    selectedVoice,
    changeVoice,
    isReady,
  };
};

/**
 * Combined hook that provides both speech recognition and text-to-speech
 */
export const useSpeech = () => {
  const stt = useSpeechRecognition();
  const tts = useTTS();

  return {
    ...stt,
    ...tts,
    // Helper method to convert speech to text and then speak the response
    async converseThenSpeak(onResultCallback) {
      // Start listening
      await stt.startListening({
        onResult: async (text, isInterim) => {
          // When we get a final result
          if (!isInterim && text) {
            // Stop listening first
            stt.stopListening();

            // Process the text through the callback
            if (onResultCallback) {
              const response = await onResultCallback(text);

              // Speak the response if we got one
              if (response) {
                tts.speak(response);
              }
            }
          }
        },
      });
    },
  };
};
