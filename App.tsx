
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import Visualizer from './components/Visualizer';
import { createBlob, decode, decodeAudioData } from './utils/audioUtils';
import ImageGenerationAnimation from './components/ImageGenerationAnimation';

const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
const imageKeywords = ['generate', 'create', 'draw', 'imagine', 'image of', 'picture of'];

// --- UI COMPONENTS DEFINED WITHIN APP ---

const Particles: React.FC = () => {
  return (
    <div className="particles-bg" aria-hidden="true">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 20}s`,
            animationDuration: `${Math.random() * 10 + 10}s`,
          }}
        />
      ))}
    </div>
  );
};

const CosmicTitle: React.FC = () => (
  <header className="absolute top-8 left-1/2 -translate-x-1/2 z-10 w-full px-4">
    <h1 className="cosmic-title text-4xl md:text-6xl">ProtoCall AI</h1>
  </header>
);

interface AIResponseDisplayProps {
  text: string | null;
  images: string[];
}
const AIResponseDisplay: React.FC<AIResponseDisplayProps> = ({ text, images }) => {
  const animatedText = text?.split(' ').map((word, index) => (
    <span key={index} className="word" style={{ animationDelay: `${index * 0.1}s` }}>
      {word}&nbsp;
    </span>
  ));

  return (
    <div className="ai-response-container">
      {text && <p className="ai-response-text">{animatedText}</p>}
      {images.length > 0 && (
        <div className="ai-response-images">
          {images.map((url, index) => (
            <img 
              key={index} 
              src={url} 
              alt={`Generated image ${index + 1}`}
              style={{ animationDelay: `${index * 0.2}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const splitTextToSpans = (text: string) => {
  return text.split('').map((char, index) => (
    <span key={index} style={{'--i': index + 1} as React.CSSProperties}>
      <span>{char === ' ' ? '\u00A0' : char}</span>
    </span>
  ));
};

const LiveSessionButton: React.FC<{ isLive: boolean, isConnecting: boolean, onClick: () => void }> = ({ isLive, isConnecting, onClick }) => {
  return (
    <label className="area">
      <input type="checkbox" checked={isLive} onChange={onClick} disabled={isConnecting} />
      <div className="area-button">
        <svg width="423" height="274" viewBox="0 0 423 274" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M93.3368 136.663C49.6104 128.127 30.5087 134.168 2.08112 145.122" strokeOpacity="0.4" strokeLinecap="round"></path>
          <path d="M94.6914 170.451C55.042 190.819 43.7361 207.401 28.1198 233.623" strokeLinecap="round"></path>
          <path d="M147.365 181.074C124.487 219.412 123.652 239.483 124.252 270.021" strokeOpacity="0.4" strokeLinecap="round"></path>
          <path d="M209.461 179.848L209.461 271.744" strokeLinecap="round"></path>
          <path d="M271.59 181.074C294.468 219.412 295.303 239.483 294.703 270.021" strokeOpacity="0.4" strokeLinecap="round"></path>
          <path d="M327.264 170.451C366.913 190.819 378.219 207.401 393.835 233.623" strokeLinecap="round"></path>
          <path d="M329.618 136.663C373.345 128.127 392.446 134.168 420.874 145.122" strokeOpacity="0.4" strokeLinecap="round"></path>
          <path d="M328.313 104.665C355.465 69.244 373.772 61.0955 402.313 50.4414" strokeLinecap="round"></path>
          <path d="M268.666 93.3922C282.624 50.9621 297.219 37.204 320.646 17.6894" strokeOpacity="0.4" strokeLinecap="round"></path>
          <path d="M209.461 93.5837L209.461 1.68781" strokeLinecap="round"></path>
          <path d="M150.289 93.3922C136.331 50.9621 121.736 37.204 98.3089 17.6894" strokeOpacity="0.4" strokeLinecap="round"></path>
          <path d="M93.6422 104.665C66.4898 69.244 48.1828 61.0955 19.6421 50.4414" strokeLinecap="round"></path>
        </svg>
        <button className="button">
          <div className="wrap">
            <div className="reflex"></div>
            <div className="outline"></div>
            <div className="liquid">
              <div className="waves">
                <div className="wave-1"></div>
                <div className="wave-2"></div>
                <div className="wave-3"></div>
              </div>
            </div>
            <div className="text">
              <p className="state-1">{splitTextToSpans("START SESSION")}</p>
              <p className="state-2">{splitTextToSpans("END SESSION")}</p>
            </div>
            <div className="drops"></div>
          </div>
        </button>
      </div>
      <div className="splash">
        <div className="particles">
          <div className="left">
            <div className="particle particle-1"></div>
            <div className="particle particle-2"></div>
          </div>
          <div className="right">
            <div className="particle particle-1"></div>
            <div className="particle particle-2"></div>
          </div>
        </div>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1">
        <defs>
          <filter id="liquid">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"></feGaussianBlur>
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="liquid"></feColorMatrix>
          </filter>
        </defs>
      </svg>
    </label>
  );
};

const ProtoCallApp: React.FC<{ apiKey: string }> = ({ apiKey }) => {
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // AI speaking
  const [isListening, setIsListening] = useState(false); // User recording
  const [error, setError] = useState<string | null>(null);
  
  const [isResponding, setIsResponding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponseText, setAiResponseText] = useState<string | null>(null);
  const [aiImages, setAiImages] = useState<string[]>([]);

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const ai = useMemo(() => new GoogleGenAI({ apiKey }), [apiKey]);

  useEffect(() => {
    return () => {
      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
      }
      cleanupAudio();
    };
  }, []);
  
  const cleanupAudio = () => {
      setIsLive(false);
      setIsConnecting(false);
      setIsListening(false);
      setIsSpeaking(false);

      if(scriptProcessorRef.current){
          scriptProcessorRef.current.disconnect();
          scriptProcessorRef.current = null;
      }
      if(mediaStreamSourceRef.current){
          mediaStreamSourceRef.current.disconnect();
          mediaStreamSourceRef.current = null;
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      inputAudioContextRef.current?.close().then(() => inputAudioContextRef.current = null);
      outputAudioContextRef.current?.close().then(() => outputAudioContextRef.current = null);
      audioSourcesRef.current.clear();
  }

  const processImagePrompt = async (prompt: string) => {
    setIsResponding(true);
    setIsGenerating(true);
    setAiResponseText(null);
    setAiImages([]);

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 2,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        const imageUrls = response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
        
        setAiImages(imageUrls);
        setIsGenerating(false);
        
        setTimeout(() => {
            setIsResponding(false);
            setAiImages([]);
        }, 8000); // Show images for 8 seconds
        
    } catch (err: any) {
        setAiResponseText(`Sorry, I couldn't create that: ${err.message}`);
        setIsGenerating(false);
        setTimeout(() => {
            setIsResponding(false);
            setAiResponseText(null);
        }, 8000);
    }
  }

  const handleToggleLive = useCallback(async () => {
    if (isLive || isConnecting) {
      if (sessionPromiseRef.current) {
        try {
          const session = await sessionPromiseRef.current;
          session.close();
        } catch (e) {
          console.error("Error closing session:", e);
        } finally {
            sessionPromiseRef.current = null;
        }
      }
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            console.log('Session opened.');
            
            inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
            outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
            
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const inputAudioContext = inputAudioContextRef.current;
            mediaStreamSourceRef.current = inputAudioContext.createMediaStreamSource(streamRef.current);
            scriptProcessorRef.current = inputAudioContext.createScriptProcessor(4096, 1, 1);

            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            
            scriptProcessorRef.current.connect(inputAudioContext.destination);
            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            setIsListening(true);
            setIsConnecting(false);
            setIsLive(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            const outputAudioContext = outputAudioContextRef.current;
            if (!outputAudioContext) return;
            
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const fullInput = currentInputTranscriptionRef.current.trim();
              const fullOutput = currentOutputTranscriptionRef.current.trim();
              
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';

              const isImagePrompt = imageKeywords.some(keyword => fullInput.toLowerCase().includes(keyword));

              if (isImagePrompt && fullInput) {
                if(sessionPromiseRef.current) {
                  sessionPromiseRef.current.then(session => session.close());
                }
                processImagePrompt(fullInput);
              } else if (fullOutput) {
                setAiResponseText(fullOutput);
                setIsResponding(true);
                setTimeout(() => {
                  setIsResponding(false);
                  setAiResponseText(null);
                }, 5000 + fullOutput.length * 50);
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);

              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);

              source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
                if (audioSourcesRef.current.size === 0) {
                  setIsSpeaking(false);
                }
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              for (const source of audioSourcesRef.current.values()) {
                source.stop();
              }
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError(`Connection error: ${e.message}`);
            cleanupAudio();
          },
          onclose: () => {
            console.log('Session closed.');
            cleanupAudio();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: 'You are ProtoCall AI, a friendly and helpful conversational assistant. You can generate images if asked. Keep your responses concise and natural.',
        },
      });
    } catch (e: any) {
      console.error(e);
      setError(`Failed to start session: ${e.message}`);
      setIsConnecting(false);
    }
  }, [isLive, isConnecting, ai]);

  return (
    <div className="h-screen w-screen relative flex items-center justify-center">
        <Particles />
        <CosmicTitle />

        {isResponding ? (
          isGenerating ? (
            <ImageGenerationAnimation />
          ) : (
            <AIResponseDisplay text={aiResponseText} images={aiImages} />
          )
        ) : (
          <div className="interaction-hub" style={{ opacity: isResponding ? 0 : 1 }}>
            <Visualizer isLive={isLive} isSpeaking={isSpeaking} isConnecting={isConnecting} isListening={isListening}/>

            <div className="mt-8 flex flex-col items-center justify-center space-y-4">
               <LiveSessionButton isLive={isLive} isConnecting={isConnecting} onClick={handleToggleLive} />
            </div>
            {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
          </div>
        )}
      </div>
  );
}

const App: React.FC = () => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return (
      <div className="h-screen w-screen relative flex items-center justify-center">
        <Particles />
        <CosmicTitle />
        <div className="z-10 text-center p-8 bg-black/50 rounded-lg border border-red-500/50 shadow-lg shadow-red-500/20 max-w-2xl">
            <h2 className="text-3xl text-red-400 font-bold mb-4">Configuration Error</h2>
            <p className="text-xl text-gray-300 mb-4">
                The Gemini API Key is missing.
            </p>
            <p className="text-md text-gray-400 mt-2">
                Please make sure the <code className="bg-gray-700 p-1 rounded font-mono">API_KEY</code> environment variable is set in your hosting environment (e.g., Netlify).
            </p>
            <div className="mt-6 pt-4 border-t border-gray-700 text-left">
                <h3 className="text-lg text-cyan-400 font-semibold mb-2">Troubleshooting Tip:</h3>
                <p className="text-sm text-gray-400">
                    For security, most hosting platforms do not expose environment variables to the browser by default. You often need to prefix the variable name.
                </p>
                <p className="text-sm text-gray-400 mt-2">
                    Try renaming your variable in your Netlify settings from <code className="bg-gray-700 p-1 rounded font-mono">API_KEY</code> to <code className="bg-gray-700 p-1 rounded font-mono">VITE_API_KEY</code> and then redeploying your site.
                </p>
            </div>
        </div>
      </div>
    );
  }

  return <ProtoCallApp apiKey={apiKey} />;
};

export default App;
