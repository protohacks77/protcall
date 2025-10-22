
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Chat } from '@google/genai';
import { ChatMessage } from './types';
import Visualizer from './components/Visualizer';
import Message from './components/Message';
import LiveTranscription from './components/LiveTranscription';
import ImageModal from './components/ImageModal';
import { createBlob, decode, decodeAudioData } from './utils/audioUtils';

const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

const App: React.FC = () => {
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // AI speaking
  const [isListening, setIsListening] = useState(false); // User recording
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [liveUserTranscription, setLiveUserTranscription] = useState('');
  const [lastAiChunk, setLastAiChunk] = useState<{ text: string, duration: number, id: string } | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<'user' | 'ai' | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  
  const lastTranscriptionText = useRef('');
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  // Initialize the AI client. Assumes API_KEY is provided by the deployment environment.
  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
      }
      cleanupAudio();
    };
  }, []);

  const handleToggleLive = useCallback(async () => {
    if (isLive) {
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

            setIsConnecting(false);
            setIsLive(true);
            setMessages([{id: 'start', sender: 'ai', text: 'Live connection established. Press "Start Speaking" to talk.'}]);
          },
          onmessage: async (message: LiveServerMessage) => {
            const outputAudioContext = outputAudioContextRef.current;
            if (!outputAudioContext) return;
            
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += text;
              lastTranscriptionText.current += text;
              if (currentSpeaker !== 'ai') {
                setCurrentSpeaker('ai');
                setLiveUserTranscription(''); 
              }

            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
               if (currentSpeaker !== 'user') {
                setCurrentSpeaker('user');
                setLiveUserTranscription(text);
                setLastAiChunk(null);
              } else {
                setLiveUserTranscription(prev => prev + text);
              }
            }

            if (message.serverContent?.turnComplete) {
              const fullInput = currentInputTranscriptionRef.current.trim();
              const fullOutput = currentOutputTranscriptionRef.current.trim();
              
              if(fullInput){
                  setMessages(prev => [...prev, {id: crypto.randomUUID(), sender: 'user', text: fullInput}])
              }
              if(fullOutput){
                  setMessages(prev => [...prev, {id: crypto.randomUUID(), sender: 'ai', text: fullOutput}])
              }
              
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
              setLiveUserTranscription('');
              setCurrentSpeaker(null);
              setLastAiChunk(null);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);

              if (lastTranscriptionText.current) {
                setLastAiChunk({
                  text: lastTranscriptionText.current,
                  duration: audioBuffer.duration,
                  id: crypto.randomUUID(),
                });
                lastTranscriptionText.current = '';
              }
              
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
          systemInstruction: 'You are ProtoCall AI, a friendly and helpful conversational assistant. Keep your responses concise and natural.',
        },
      });
    } catch (e: any) {
      console.error(e);
      setError(`Failed to start session: ${e.message}`);
      setIsConnecting(false);
    }
  }, [isLive, currentSpeaker, ai]);
  
  const handleToggleSpeaking = () => {
    if (!isLive || isConnecting || !mediaStreamSourceRef.current || !scriptProcessorRef.current) return;

    if (isListening) {
        mediaStreamSourceRef.current.disconnect(scriptProcessorRef.current);
        setIsListening(false);
    } else {
        setLiveUserTranscription('');
        setCurrentSpeaker('user');
        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
        setIsListening(true);
    }
  };

  const cleanupAudio = () => {
      setIsLive(false);
      setIsConnecting(false);
      setIsListening(false);
      setIsSpeaking(false);
      setLiveUserTranscription('');
      setCurrentSpeaker(null);
      setLastAiChunk(null);

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
  
  const handleSendTextMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      const prompt = textInput.trim();
      if (!prompt) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'user',
        text: prompt,
      };
      setMessages(prev => [...prev, userMessage]);
      setTextInput('');

      const aiMessageId = crypto.randomUUID();
      const loadingMessage: ChatMessage = {
        id: aiMessageId,
        sender: 'ai',
        text: '',
        isLoading: true,
      };
      setMessages(prev => [...prev, loadingMessage]);

      const imageKeywords = ['generate', 'create', 'draw', 'imagine', 'image of', 'picture of'];
      const isImagePrompt = imageKeywords.some(keyword => prompt.toLowerCase().includes(keyword));

      try {
        if (isImagePrompt) {
          const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 2,
              outputMimeType: 'image/jpeg',
            },
          });

          const imageUrls = response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
          
          const aiTextMessage: ChatMessage = {
            id: aiMessageId,
            sender: 'ai',
            text: "I've generated some images for you.",
          };
          setMessages(prev => prev.map(msg => msg.id === aiMessageId ? aiTextMessage : msg));

          setModalImages(imageUrls);
          setIsModalOpen(true);

        } else {
          if (!chatRef.current) {
            chatRef.current = ai.chats.create({ model: 'gemini-2.5-flash' });
          }
          const response = await chatRef.current.sendMessage({ message: prompt });
          
          const aiTextMessage: ChatMessage = {
            id: aiMessageId,
            sender: 'ai',
            text: response.text,
          };

          setMessages(prev => prev.map(msg => msg.id === aiMessageId ? aiTextMessage : msg));
        }
      } catch (err: any) {
        console.error("Error processing text message:", err);
        const errorMessage: ChatMessage = {
          id: aiMessageId,
          sender: 'ai',
          text: `Sorry, I ran into an error: ${err.message}`,
        };
        setMessages(prev => prev.map(msg => msg.id === aiMessageId ? errorMessage : msg));
      }
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalImages([]);
    };

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-gray-900 text-gray-100 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-cyan-500/[0.05]"></div>
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full z-10">
        <header className="text-center py-6">
          <h1 className="text-5xl font-bold text-cyan-400 tracking-widest uppercase">
            ProtoCall AI
          </h1>
          <p className="text-gray-400 mt-2 tracking-wider uppercase">Your Real-Time Conversational Partner</p>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center bg-black/20 rounded-xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10 backdrop-blur-sm p-6">
          <Visualizer isLive={isLive} isSpeaking={isSpeaking} isConnecting={isConnecting} isListening={isListening}/>

          <LiveTranscription
            userText={liveUserTranscription}
            aiChunk={lastAiChunk}
            speaker={currentSpeaker}
          />

          <div className="mt-4 flex items-center justify-center space-x-4">
            {!isLive ? (
              <button
                onClick={handleToggleLive}
                disabled={isConnecting}
                className={`px-8 py-3 rounded-full text-lg font-bold tracking-wider transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50
                  bg-cyan-500 hover:bg-cyan-600 text-gray-900 focus:ring-cyan-400 shadow-lg shadow-cyan-500/30
                  ${isConnecting ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}
                `}
              >
                {isConnecting ? 'CONNECTING...' : 'START LIVE SESSION'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleToggleSpeaking}
                  disabled={isSpeaking} // Disable while AI is talking
                  className={`px-8 py-3 rounded-full text-lg font-bold tracking-wider transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50
                    ${isListening
                      ? 'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-400 shadow-lg shadow-amber-500/30'
                      : 'bg-cyan-500 hover:bg-cyan-600 text-gray-900 focus:ring-cyan-400 shadow-lg shadow-cyan-500/30'}
                    ${isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isListening ? 'FINISH SPEAKING' : 'START SPEAKING'}
                </button>
                <button
                  onClick={handleToggleLive}
                  className="px-6 py-3 rounded-full text-base font-bold tracking-wider transition-colors duration-300 bg-red-800/80 hover:bg-red-700 text-red-100 focus:outline-none focus:ring-4 focus:ring-red-500/50"
                >
                  END SESSION
                </button>
              </>
            )}
          </div>
          {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </main>
        
        <div className="mt-6 w-full flex-grow flex flex-col">
            <div className="flex-grow h-64 overflow-y-auto p-4 bg-black/20 rounded-t-xl border-t border-x border-cyan-500/20 backdrop-blur-sm">
                {messages.map((msg) => (
                    <Message key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendTextMessage} className="flex items-center p-4 bg-gray-800/50 rounded-b-xl border-b border-x border-cyan-500/20 backdrop-blur-sm">
                <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type a message or ask to generate an image..."
                    className="flex-grow bg-transparent border-none focus:ring-0 text-gray-200 placeholder-gray-500"
                />
                <button 
                    type="submit"
                    disabled={!textInput}
                    className="ml-4 p-2 rounded-full bg-cyan-500 text-gray-900 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    aria-label="Send message"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                </button>
            </form>
        </div>
      </div>
      {isModalOpen && <ImageModal images={modalImages} onClose={handleCloseModal} />}
    </div>
  );
};

export default App;
