'use client';

import { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  className?: string;
  revealDirection?: 'start' | 'end' | 'center';
  useOriginalCharsOnly?: boolean;
  characters?: string;
  animateOn?: 'view' | 'hover';
}

export function DecryptedText({
  text,
  speed = 50,
  className = '',
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+-=[]{}|;:,.<>?',
  animateOn = 'hover'
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const iterationCount = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);

  const startAnimation = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    iterationCount.current = 0;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setDisplayText(prev => 
        text
          .split('')
          .map((char, index) => {
            if (index < iterationCount.current) {
              return text[index];
            }
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join('')
      );

      if (iterationCount.current >= text.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setIsAnimating(false);
        setDisplayText(text);
      }

      iterationCount.current += 1 / 3;
    }, speed);
  };

  useEffect(() => {
    let observer: IntersectionObserver | null = null;

    if (animateOn === 'view') {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startAnimation();
            }
          });
        },
        { threshold: 0.5 }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [animateOn, text]);

  return (
    <span
      ref={containerRef}
      className={`inline-block cursor-default ${className}`}
      onMouseEnter={animateOn === 'hover' ? startAnimation : undefined}
    >
      {displayText}
    </span>
  );
}
