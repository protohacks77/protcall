
import React from 'react';

interface ImageModalProps {
  images: string[];
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ images, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800/80 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 p-6 w-full max-w-4xl m-4 relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-3xl font-bold text-cyan-400 mb-6 text-center tracking-wider uppercase">Generated Images</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {images.map((url, index) => (
            <div key={index} className="relative group bg-gray-900 rounded-lg overflow-hidden border border-cyan-500/20">
              <img src={url} alt={`Generated image ${index + 1}`} className="w-full h-full object-contain" style={{ maxHeight: '60vh' }} />
              <a
                href={url}
                download={`protocall-ai-image-${index + 1}.jpeg`}
                className="absolute bottom-3 right-3 bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm flex items-center space-x-2"
                aria-label="Download image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.293a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
