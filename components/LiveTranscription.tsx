import React, { useState, useEffect, useRef } from 'react';

interface LiveTranscriptionProps {
  userText: string;
  aiChunk: { text: string; duration: number; id: string } | null;
  speaker: 'user' | 'ai' | null;
}

/**
 * Splits a string into an array of words, preserving all spacing and punctuation.
 * It groups each word with its trailing whitespace.
 * @param text The string to split.
 * @returns An array of words with trailing spaces.
 */
const groupSpacedWords = (text: string): string[] => {
  if (!text) return [];
  // Split on spaces, but keep the spaces in the array
  const parts = text.split(/(\s+)/);
  const result = [];
  // Group words with their trailing space
  for (let i = 0; i < parts.length; i += 2) {
    result.push(parts[i] + (parts[i+1] || ''));
  }
  // If the original text started with a space, the first element of `parts` is "",
  // and the first element of `result` is just the space. We combine it with the next word.
  if (result.length > 1 && parts[0] === '') {
    const firstItem = result.shift()!;
    result[0] = firstItem + result[0];
  }
  return result.filter(w => w); // filter out any potential empty strings
};


const LiveTranscription: React.FC<LiveTranscriptionProps> = ({ userText, aiChunk, speaker }) => {
  const [displayedWords, setDisplayedWords] = useState<{ word: string, id: string }[]>([]);
  const timeoutIds = useRef<number[]>([]);

  const clearTimeouts = () => {
    timeoutIds.current.forEach(clearTimeout);
    timeoutIds.current = [];
  };

  // Effect to clear display when speaker changes
  useEffect(() => {
    setDisplayedWords([]);
    clearTimeouts();
  }, [speaker]);

  // Effect to animate AI speech with precise timing
  useEffect(() => {
    if (!aiChunk || speaker !== 'ai') return;

    const words = groupSpacedWords(aiChunk.text);
    if (words.length === 0 || aiChunk.duration <= 0) {
      if(words.length > 0){ // if there's text but no duration, display it statically
          const newWords = words.map((word, index) => ({ word, id: `${aiChunk.id}-${index}` }));
          setDisplayedWords(prev => [...prev, ...newWords].slice(-15));
      }
      return;
    }

    const delayPerWord = (aiChunk.duration * 1000) / words.length;

    words.forEach((word, index) => {
      const timeoutId = setTimeout(() => {
        const newWord = { word, id: `${aiChunk.id}-${index}` };
        setDisplayedWords(prev => [...prev, newWord].slice(-15));
      }, index * delayPerWord);
      timeoutIds.current.push(timeoutId as unknown as number);
    });

    return clearTimeouts;
  }, [aiChunk]);

  if (!speaker) {
    return <div className="h-20 w-full mt-4"></div>;
  }

  const textColor = speaker === 'ai' ? 'text-cyan-300' : 'text-gray-400';

  return (
    <div className="h-20 w-full mt-4 flex items-center justify-center text-center overflow-hidden">
      <p className={`text-3xl font-bold tracking-wide leading-relaxed ${textColor}`}>
        {speaker === 'ai' ? (
          displayedWords.map(({ word, id }) => (
            <span key={id} className="word-anim">
              {word}
            </span>
          ))
        ) : (
          groupSpacedWords(userText).slice(-15).map((word, index) => (
            <span
              key={`user-${word}-${index}`}
              className="word-anim"
              style={{ animationDelay: `${index * 200}ms` }}
            >
              {word}
            </span>
          ))
        )}
      </p>
    </div>
  );
};

export default LiveTranscription;