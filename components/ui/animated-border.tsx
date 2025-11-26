"use client"

import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedBorderProps {
  children: React.ReactNode;
  isAnimating: boolean;
  className?: string;
  borderClassName?: string;
}

export function AnimatedBorder({
  children,
  isAnimating,
  className,
  borderClassName: _borderClassName
}: AnimatedBorderProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Animated border */}
      {isAnimating && (
        <>
          {/* Background glow effect */}
          <div 
            className="absolute inset-0 rounded-lg opacity-20 blur-2xl animate-pulse"
            style={{
              background: 'linear-gradient(45deg, #3B82F6, #60A5FA, #3B82F6)',
            }}
          />
          
          {/* Rotating gradient border */}
          <div 
            className="absolute -inset-[1px] rounded-lg opacity-75"
            style={{
              background: 'linear-gradient(45deg, #3B82F6, #60A5FA, #93C5FD, #60A5FA, #3B82F6)',
              backgroundSize: '400% 400%',
              animation: 'gradient-rotate 3s ease infinite',
            }}
          />
          
          {/* Inner background to create border effect */}
          <div 
            className="absolute inset-[2px] bg-background rounded-lg"
          />
        </>
      )}
      
      {/* Content */}
      <div className={cn(
        "relative z-10",
        isAnimating && "transition-all duration-300"
      )}>
        {children}
      </div>
      
      {/* Inline styles for animation */}
      <style jsx>{`
        @keyframes gradient-rotate {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}