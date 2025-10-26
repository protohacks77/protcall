import React from 'react';

interface VisualizerProps {
  isLive: boolean;
  isSpeaking: boolean;
  isConnecting: boolean;
  isListening: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ isLive, isSpeaking, isConnecting, isListening }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-48 h-48 flex items-center justify-center">
        {isSpeaking || isConnecting ? (
          <svg className="pl" viewBox="0 0 240 240">
            <circle className="pl__ring pl__ring--a" cx="120" cy="120" r="105" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round"></circle>
            <circle className="pl__ring pl__ring--b" cx="120" cy="120" r="35" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round"></circle>
            <circle className="pl__ring pl__ring--c" cx="85" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
            <circle className="pl__ring pl__ring--d" cx="155" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
          </svg>
        ) : (
          (() => {
            const orbColor = isLive ? 'bg-cyan-500' : 'bg-gray-600';
            const pulseAnimation = isLive && !isListening ? 'animate-pulse' : '';
            return (
              <>
                {isListening && (
                   <div className="absolute w-full h-full rounded-full border-4 border-red-500/80 animate-ping"></div>
                )}
                {isLive && !isListening && (
                  <>
                    <div className="absolute w-full h-full rounded-full bg-cyan-500/10 animate-ping"></div>
                    <div className="absolute w-full h-full rounded-full bg-cyan-500/20 animate-pulse delay-75"></div>
                  </>
                )}
                <div className={`w-32 h-32 rounded-full ${orbColor} transition-colors duration-500 shadow-2xl shadow-cyan-500/30 flex items-center justify-center ${pulseAnimation}`}>
                  <div className={`w-24 h-24 rounded-full ${orbColor} border-2 ${isListening ? 'border-red-400/50' : 'border-cyan-300/50'}`}></div>
                </div>
              </>
            );
          })()
        )}
      </div>
    </div>
  );
};

export default Visualizer;