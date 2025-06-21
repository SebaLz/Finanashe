'use client';

import { useState, useEffect } from 'react';

interface AnimatedWordsProps {
  words: string[];
  className?: string;
  duration?: number;
}

export default function AnimatedWords({ 
  words, 
  className = "", 
  duration = 2000 
}: AnimatedWordsProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
        setIsVisible(true);
      }, 300); // Tiempo para fade out
      
    }, duration);

    return () => clearInterval(interval);
  }, [words.length, duration]);

  return (
    <span 
      className={`
        inline-block min-w-[200px] text-left
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'}
        ${className}
      `}
    >
      {words[currentWordIndex]}
    </span>
  );
} 