import React from 'react';
import { Cpu, Settings, ShieldCheck, MonitorPlay, Activity, Loader2, Command } from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import { motion } from 'framer-motion';

interface TopNavProps {
  onOpenSettings: () => void;
  onOpenCmdk: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenSettings, onOpenCmdk }) => {
  const { isReady, progressText, isProcessing } = useEngine();
  const isError = !isReady && !isProcessing && (progressText.toLowerCase().includes('error') || progressText.toLowerCase().includes('not supported') || progressText.toLowerCase().includes('failed'));

  return (
    <nav className="h-16 border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-30 relative shadow-sm font-sans">
      {/* AI Processing progress top glow bar */}
      {isProcessing && (
        <motion.div
          className="absolute bottom-0 left-0 h-[2.5px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-400 shadow-[0_0_12px_#7c3aed]"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 10, ease: 'easeInOut' }}
        />
      )}

      {/* Left: Logo & privacy badge */}
      <div className="flex items-center space-x-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 via-fuchsia-500/20 to-emerald-500/20 border border-violet-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.2)]">
          <Activity className="text-violet-500 dark:text-violet-400" size={22} />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-display font-bold text-lg text-slate-900 dark:text-white leading-none tracking-tight">
              ChatPulse <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">AI</span>
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
              v2.0 Premium
            </span>
          </div>
          <div className="flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold space-x-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 neon-glow-emerald animate-pulse" />
            <ShieldCheck size={11} />
            <span className="tracking-wide">100% On-Device / Off-Grid</span>
          </div>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center space-x-4">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCmdk}
          className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-xs"
        >
          <Command size={13} />
          <span>Quick Commands</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded border border-slate-300 dark:border-zinc-700">
            ⌘K
          </kbd>
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-white/10" />

        {/* Engine status */}
        <div className="flex items-center space-x-2.5">
          {!isReady && !isProcessing && !isError && (
            <Loader2 size={14} className="animate-spin text-amber-400" />
          )}
          {isError && (
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          )}
          {isReady && !isProcessing && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 neon-glow-emerald" />
          )}
          {isProcessing && (
            <span className="w-2 h-2 rounded-full bg-violet-400 neon-glow-violet animate-ping" />
          )}
          <div className="flex flex-col items-end text-right max-w-[240px]">
            <span className={`text-xs font-semibold tabular-nums font-mono ${
              isError ? 'text-red-400' : isReady ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'
            }`}>
              {isProcessing ? 'Analysing…' : isError ? 'Engine Error' : isReady ? 'Engine Ready' : 'Loading…'}
            </span>
            <span className={`text-[10px] truncate w-full font-mono ${
              isError ? 'text-red-400/80' : 'text-slate-500 dark:text-zinc-400'
            }`} title={progressText}>
              {isProcessing ? 'Generating structured intelligence…' : progressText}
            </span>
          </div>
        </div>

        <div className="w-px h-5 bg-slate-200 dark:bg-white/10" />

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Open settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </nav>
  );
};
