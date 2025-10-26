
import React from 'react';

const ImageGenerationAnimation: React.FC = () => {
  return (
    <div className="generation-container">
      <div className="generation-canvas-glow"></div>
      <div className="generation-particles">
        {Array.from({ length: 50 }).map((_, i) => (
          <div 
            key={i} 
            className="generation-particle" 
            style={{ '--i': i } as React.CSSProperties}
          ></div>
        ))}
      </div>
      <p className="generation-text">Synthesizing Vision...</p>
    </div>
  );
};

export default ImageGenerationAnimation;
