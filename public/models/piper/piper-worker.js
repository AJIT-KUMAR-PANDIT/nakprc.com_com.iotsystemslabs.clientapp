// Piper TTS Web Worker
self.importScripts('/models/piper/piper-wasm.js');

let initialized = false;
let piperModule = null;
let baseUrl = '/models/piper';
let currentVoice = null;
let voiceModels = {};

// Voice definitions
const VOICE_DEFINITIONS = [
  {
    name: 'indic_female',
    language: 'hi-IN',
    gender: 'female',
    description: 'Indian Female Voice',
    modelFile: 'hi_IN_indic_low.onnx',
    configFile: 'hi_IN_indic_low.onnx.json'
  },
  {
    name: 'english_indian_female',
    language: 'en-IN',
    gender: 'female',
    description: 'English (Indian) Female Voice',
    modelFile: 'en_IN_female_low.onnx',
    configFile: 'en_IN_female_low.onnx.json'
  }
];

// Initialize the Piper module
async function initialize(url) {
  if (initialized) return true;
  
  baseUrl = url || baseUrl;
  
  try {
    // Initialize the WASM module
    piperModule = await PiperTTS({
      locateFile: (file) => `${baseUrl}/${file}`
    });
    
    // Load default voice
    await loadVoice('indic_female');
    
    initialized = true;
    self.postMessage({ type: 'initialized' });
    return true;
  } catch (err) {
    self.postMessage({ type: 'error', message: `Failed to initialize Piper: ${err.message}` });
    return false;
  }
}

// Load a voice model
async function loadVoice(voiceName) {
  if (voiceModels[voiceName]) {
    currentVoice = voiceName;
    return voiceModels[voiceName];
  }
  
  const voiceDef = VOICE_DEFINITIONS.find(v => v.name === voiceName);
  if (!voiceDef) {
    throw new Error(`Voice not found: ${voiceName}`);
  }
  
  try {
    // In a real implementation, this would load the ONNX model
    // For now, we'll create a placeholder
    voiceModels[voiceName] = {
      name: voiceDef.name,
      language: voiceDef.language,
      model: voiceDef
    };
    
    currentVoice = voiceName;
    return voiceModels[voiceName];
  } catch (err) {
    throw new Error(`Failed to load voice ${voiceName}: ${err.message}`);
  }
}

// Generate speech from text
async function speak(text, voiceName) {
  if (!initialized) {
    await initialize();
  }
  
  if (voiceName && voiceName !== currentVoice) {
    await loadVoice(voiceName);
  }
  
  try {
    // In a real implementation, this would call the WASM module to generate speech
    // For now, we'll generate a simple sine wave as a placeholder
    const audioData = generateDummyAudio(text);
    
    self.postMessage({ 
      type: 'audio', 
      audio: audioData,
      voiceName: currentVoice
    }, [audioData]);
  } catch (err) {
    self.postMessage({ type: 'error', message: `Speech generation failed: ${err.message}` });
  }
}

// Generate a dummy audio waveform for testing
function generateDummyAudio(text) {
  const sampleRate = 22050;
  const duration = 0.5 + text.length * 0.05; // Rough estimate of speech duration
  const numSamples = Math.floor(sampleRate * duration);
  
  // Create WAV file
  const dataSize = numSamples * 2; // 16-bit samples
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Generate a simple sine wave
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const value = Math.sin(440 * Math.PI * 2 * t) * Math.exp(-t * 2);
    const sample = Math.floor(value * 32767);
    view.setInt16(44 + i * 2, sample, true);
  }
  
  return buffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Handle messages from the main thread
self.onmessage = function(e) {
  const message = e.data;
  
  switch (message.type) {
    case 'initialize':
      initialize(message.baseUrl);
      break;
      
    case 'listVoices':
      self.postMessage({ type: 'voices', voices: VOICE_DEFINITIONS });
      break;
      
    case 'speak':
      speak(message.text, message.voiceName);
      break;
      
    case 'stop':
      // In a real implementation, this would stop any ongoing synthesis
      break;
      
    default:
      self.postMessage({ type: 'error', message: `Unknown message type: ${message.type}` });
  }
};