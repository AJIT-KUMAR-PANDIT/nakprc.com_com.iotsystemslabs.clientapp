import { useState, useEffect, useCallback } from 'react';
import { isPlatform } from '@ionic/react';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const useLLM = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelPath, setModelPath] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  
  const MODEL_URL = 'https://huggingface.co/chrislazar25/qwen-0.5b-gguf/resolve/main/qwen2-0_5b-instruct-q4_0.gguf';
  const MODEL_FILENAME = 'qwen2-0_5b-instruct-q4_0.gguf';
  const PROMPT_URL = '/prompts/prompt.json';
  
  // Check if model exists and load it
  useEffect(() => {
    checkModelExists();
  }, []);
  
  const checkModelExists = async () => {
    try {
      if (isPlatform('capacitor')) {
        // Mobile implementation
        try {
          // First check if directory exists, create if not
          try {
            await Filesystem.mkdir({
              path: 'models',
              directory: Directory.Data,
              recursive: true
            });
          } catch (e) {
            // Directory might already exist
          }
          
          const result = await Filesystem.readdir({
            path: 'models',
            directory: Directory.Data
          });
          
          const modelExists = result.files.some(file => file.name === MODEL_FILENAME);
          
          if (modelExists) {
            // Get the full path to the model file
            const modelFilePath = `${Directory.Data}/models/${MODEL_FILENAME}`;
            setModelPath(modelFilePath);
            setIsModelLoaded(true);
            await initializeModel(modelFilePath);
          } else {
            console.log('Model not found on mobile, needs download');
          }
        } catch (err) {
          console.error('Error checking model on mobile:', err);
          // If error is because directory doesn't exist, we'll download the model
        }
      } else {
        // Web implementation - check IndexedDB first
        try {
          const db = await openModelDB();
          const tx = db.transaction('models', 'readonly');
          const store = tx.objectStore('models');
          const modelRecord = await store.get(MODEL_FILENAME);
          
          if (modelRecord) {
            // Model exists in IndexedDB
            console.log('Model found in IndexedDB');
            
            // Create a blob URL for the model
            const blob = modelRecord.data;
            const blobUrl = URL.createObjectURL(blob);
            setModelPath(blobUrl);
            setIsModelLoaded(true);
            await initializeModel(blobUrl);
          } else {
            // Check if model exists in public folder as fallback
            const publicModelPath = `${process.env.PUBLIC_URL}/models/${MODEL_FILENAME}`;
            
            try {
              const response = await fetch(publicModelPath, { method: 'HEAD' });
              if (response.ok) {
                setModelPath(publicModelPath);
                setIsModelLoaded(true);
                await initializeModel(publicModelPath);
              } else {
                console.log('Model not found locally, needs download');
              }
            } catch (err) {
              console.log('Model not found locally, needs download');
            }
          }
          
          db.close();
        } catch (err) {
          console.error('Error checking model in IndexedDB:', err);
        }
      }
    } catch (err) {
      console.error('Error checking model:', err);
      setError('Failed to check if model exists');
    }
  };
  
  const downloadModel = async () => {
    setIsLoading(true);
    setModelProgress(0);
    setStatusMessage('Preparing download...');
    
    try {
      if (isPlatform('capacitor')) {
        // Create directory if it doesn't exist
        try {
          await Filesystem.mkdir({
            path: 'models',
            directory: Directory.Data,
            recursive: true
          });
        } catch (e) {
          // Directory might already exist
        }
        
        setStatusMessage('Downloading model...');
        // Download file
        const downloadResult = await Filesystem.downloadFile({
          url: MODEL_URL,
          path: `models/${MODEL_FILENAME}`,
          directory: Directory.Data,
          progress: true,
          listener: (progress) => {
            const percentage = Math.floor((progress.bytes / progress.contentLength) * 100);
            setModelProgress(percentage);
            setStatusMessage(`Downloading model: ${percentage}% (${formatBytes(progress.bytes)} / ${formatBytes(progress.contentLength)})`);
          }
        });
        
        setStatusMessage('Initializing model...');
        // Get the full path to the downloaded file
        const modelFilePath = `${Directory.Data}/models/${MODEL_FILENAME}`;
        setModelPath(modelFilePath);
        setIsModelLoaded(true);
        await initializeModel(modelFilePath);
        
        setStatusMessage('Model ready to use');
        console.log('Model downloaded successfully to:', modelFilePath);
      } else {
        // Web implementation - download to IndexedDB
        setStatusMessage('Downloading model...');
        const response = await fetch(MODEL_URL);
        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        
        let receivedLength = 0;
        const chunks = [];
        
        while(true) {
          const {done, value} = await reader.read();
          
          if (done) {
            break;
          }
          
          chunks.push(value);
          receivedLength += value.length;
          
          const percentage = Math.floor((receivedLength / contentLength) * 100);
          setModelProgress(percentage);
          setStatusMessage(`Downloading model: ${percentage}% (${formatBytes(receivedLength)} / ${formatBytes(contentLength)})`);
        }
        
        setStatusMessage('Saving model to local storage...');
        const blob = new Blob(chunks);
        
        // Store in IndexedDB
        const db = await openModelDB();
        const tx = db.transaction('models', 'readwrite');
        const store = tx.objectStore('models');
        store.put({
          id: MODEL_FILENAME,
          data: blob,
          timestamp: Date.now(),
          size: blob.size
        });
        
        await tx.complete;
        db.close();
        
        setStatusMessage('Initializing model...');
        // Create a blob URL for the model
        const blobUrl = URL.createObjectURL(blob);
        setModelPath(blobUrl);
        setIsModelLoaded(true);
        await initializeModel(blobUrl);
        
        setStatusMessage('Model ready to use');
        console.log('Model downloaded successfully to IndexedDB and loaded from:', blobUrl);
      }
    } catch (err) {
      console.error('Error downloading model:', err);
      setError(`Failed to download model: ${err.message}`);
      setStatusMessage('Download failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to format bytes to human-readable format
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  const openModelDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('LLMModels', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  };
  
  const initializeModel = async (modelFilePath) => {
    // This would initialize the WebLLM or other inference library with the local model path
    console.log('Initializing LLM model from path:', modelFilePath);
    
    // In a real implementation, you would load the model from the local path
    // For example with WebLLM:
    // await webllm.loadModel(modelFilePath, {
    //   progressCallback: (progress) => {
    //     console.log('Model loading progress:', progress);
    //   }
    // });
    
    return Promise.resolve();
  };
  
  const generateResponse = async (prompt) => {
    if (!isModelLoaded) {
      throw new Error('Model not loaded');
    }
    
    try {
      // Fetch the prompt template
      const promptResponse = await fetch(PROMPT_URL);
      const promptTemplate = await promptResponse.json();
      
      // Format the prompt with the template
      const formattedPrompt = promptTemplate.template.replace('{{USER_INPUT}}', prompt);
      
      // In a real implementation, you would use the LLM to generate a response
      // For now, we'll simulate it with a timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          // Simulate different responses based on input
          if (prompt.toLowerCase().includes('light') || prompt.toLowerCase().includes('बत्ती')) {
            resolve(`I'll help you control that device. Processing your request now.`);
          } else if (prompt.toLowerCase().includes('weather') || prompt.toLowerCase().includes('मौसम')) {
            resolve(`The weather is currently sunny with a temperature of 25°C.`);
          } else if (prompt.toLowerCase().includes('time') || prompt.toLowerCase().includes('समय')) {
            resolve(`The current time is ${new Date().toLocaleTimeString()}.`);
          } else {
            resolve(`I received your request: "${prompt}". How can I assist you further?`);
          }
        }, 1000);
      });
      
      // Real implementation would be something like:
      // const response = await webllm.chat(formattedPrompt);
      // return response.text;
    } catch (err) {
      console.error('Error generating response:', err);
      throw new Error('Failed to generate response');
    }
  };
  
  return {
    isModelLoaded,
    isLoading,
    error,
    modelProgress,
    modelPath,
    statusMessage,
    downloadModel,
    generateResponse
  };
};