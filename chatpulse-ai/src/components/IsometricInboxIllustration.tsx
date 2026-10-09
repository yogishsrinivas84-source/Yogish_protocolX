import React from 'react';
import { motion } from 'framer-motion';

export const IsometricInboxIllustration: React.FC = () => {
  return (
    <div className="relative w-64 h-56 flex items-center justify-center select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/20 via-fuchsia-500/10 to-emerald-500/20 rounded-full blur-2xl opacity-60 animate-pulse" />

      <svg
        width="220"
        height="180"
        viewBox="0 0 220 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          <linearGradient id="isoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="isoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#18181B" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#27272A" stopOpacity="0.7" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Isometric Ground Grid Lines */}
        <g stroke="currentColor" strokeWidth="0.75" className="text-violet-500/20">
          <line x1="20" y1="100" x2="110" y2="150" />
          <line x1="110" y1="150" x2="200" y2="100" />
          <line x1="65" y1="75" x2="155" y2="125" />
          <line x1="65" y1="125" x2="155" y2="75" />
        </g>

        {/* Isometric Base Node Platform */}
        <path
          d="M110 90 L180 130 L110 170 L40 130 Z"
          fill="url(#isoGrad1)"
          stroke="#7C3AED"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />

        {/* Floating Isometric Card 1 */}
        <motion.g
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path
            d="M55 70 L115 35 L165 65 L105 100 Z"
            fill="url(#cardGrad)"
            stroke="#a1a1aa"
            strokeOpacity="0.3"
            strokeWidth="1"
          />
          {/* Card header dot & lines */}
          <circle cx="75" cy="63" r="3" fill="#EF4444" filter="url(#glow)" />
          <line x1="85" y1="63" x2="135" y2="70" stroke="#71717A" strokeWidth="2" strokeLinecap="round" />
          <line x1="85" y1="72" x2="120" y2="77" stroke="#52525B" strokeWidth="2" strokeLinecap="round" />
        </motion.g>

        {/* Floating Isometric Card 2 (Higher, offset) */}
        <motion.g
          animate={{ y: [4, -4, 4] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path
            d="M70 45 L130 10 L180 40 L120 75 Z"
            fill="url(#cardGrad)"
            stroke="#7C3AED"
            strokeWidth="1.5"
            filter="url(#glow)"
          />
          <circle cx="90" cy="38" r="3.5" fill="#10B981" filter="url(#glow)" />
          <line x1="102" y1="38" x2="155" y2="45" stroke="#A1A1AA" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="102" y1="48" x2="140" y2="54" stroke="#71717A" strokeWidth="2" strokeLinecap="round" />
        </motion.g>

        {/* Glowing Data Beams Connecting Nodes */}
        <motion.circle
          cx="110"
          cy="130"
          r="4"
          fill="#059669"
          filter="url(#glow)"
          animate={{ r: [3, 5, 3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.circle
          cx="180"
          cy="130"
          r="3"
          fill="#7C3AED"
          filter="url(#glow)"
        />
        <motion.circle
          cx="40"
          cy="130"
          r="3"
          fill="#3B82F6"
          filter="url(#glow)"
        />
      </svg>
    </div>
  );
};
