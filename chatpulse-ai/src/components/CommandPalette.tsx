import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import {
  Search,
  Upload,
  Moon,
  Sun,
  Settings,
  Cpu,
  MonitorPlay,
  Target,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  FileText
} from 'lucide-react';
import { ParsedAnalysis, ChatSession } from '../db';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession?: ChatSession | null;
  sessions?: ChatSession[];
  onSelectSession?: (id: string) => void;
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
  onSwitchEngine?: (mode: 'webgpu' | 'ollama') => void;
  onFocusInput?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  activeSession,
  sessions = [],
  onSelectSession,
  onToggleTheme,
  onOpenSettings,
  onSwitchEngine,
  onFocusInput,
}) => {
  // Toggle palette with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Re-open handled by parent or state
        }
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const parsed = activeSession?.parsedResult;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-md animate-fade-in p-4">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10 font-sans">
        <Command label="Global Command Palette">
          <div className="flex items-center px-4 border-b border-zinc-800 bg-zinc-900/80">
            <Search className="mr-3 text-zinc-400 shrink-0" size={18} />
            <Command.Input
              autoFocus
              placeholder="Search insights, sessions, or run commands..."
              className="w-full py-4 text-sm text-zinc-100 bg-transparent outline-none placeholder-zinc-500 font-sans"
            />
            <kbd className="px-2 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-400 rounded border border-zinc-700">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-96 overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-8 text-center text-xs text-zinc-500">
              No matching insights or commands found.
            </Command.Empty>

            {/* Quick Navigation / Actions */}
            <Command.Group heading="Actions & Controls" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3 py-1.5">
              <Command.Item
                onSelect={() => {
                  onFocusInput?.();
                  onClose();
                }}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium text-zinc-200 hover:bg-violet-600/20 hover:text-violet-300 transition-colors cursor-pointer"
              >
                <Upload size={14} className="text-violet-400" />
                <span>New Conversation / Paste Chat</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onToggleTheme?.();
                  onClose();
                }}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium text-zinc-200 hover:bg-violet-600/20 hover:text-violet-300 transition-colors cursor-pointer"
              >
                <Moon size={14} className="text-amber-400" />
                <span>Toggle Dark / Light Theme</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onSwitchEngine?.('webgpu');
                  onClose();
                }}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium text-zinc-200 hover:bg-violet-600/20 hover:text-violet-300 transition-colors cursor-pointer"
              >
                <MonitorPlay size={14} className="text-emerald-400" />
                <span>Switch AI Engine to WebGPU (In-Browser)</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onSwitchEngine?.('ollama');
                  onClose();
                }}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium text-zinc-200 hover:bg-violet-600/20 hover:text-violet-300 transition-colors cursor-pointer"
              >
                <Cpu size={14} className="text-blue-400" />
                <span>Switch AI Engine to Ollama (Local HTTP)</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onOpenSettings?.();
                  onClose();
                }}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium text-zinc-200 hover:bg-violet-600/20 hover:text-violet-300 transition-colors cursor-pointer"
              >
                <Settings size={14} className="text-zinc-400" />
                <span>Open System & Prompt Settings</span>
              </Command.Item>
            </Command.Group>

            {/* Extracted Insights from active session */}
            {parsed && (
              <Command.Group heading="Extracted Insights (Active Session)" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3 py-1.5 mt-2">
                {parsed.action_items?.map((item) => (
                  <Command.Item
                    key={item.id}
                    onSelect={() => {
                      onClose();
                    }}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs text-zinc-200 hover:bg-violet-600/20 hover:text-violet-300 transition-colors cursor-pointer"
                  >
                    <Target size={14} className="text-red-400 shrink-0" />
                    <span className="truncate flex-1 font-medium">{item.task}</span>
                    {item.assignee && (
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                        @{item.assignee}
                      </span>
                    )}
                  </Command.Item>
                ))}

                {parsed.decisions?.map((item) => (
                  <Command.Item
                    key={item.id}
                    onSelect={() => {
                      onClose();
                    }}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs text-zinc-200 hover:bg-violet-600/20 hover:text-violet-300 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span className="truncate flex-1 font-medium">{item.decision}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Recent Sessions */}
            {sessions.length > 0 && (
              <Command.Group heading="Recent Analyses" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3 py-1.5 mt-2">
                {sessions.slice(0, 5).map((s) => (
                  <Command.Item
                    key={s.id}
                    onSelect={() => {
                      onSelectSession?.(s.id);
                      onClose();
                    }}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs text-zinc-200 hover:bg-violet-600/20 hover:text-violet-300 transition-colors cursor-pointer"
                  >
                    <FileText size={14} className="text-violet-400 shrink-0" />
                    <span className="truncate flex-1 font-medium">{s.title}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(s.createdAt).toLocaleTimeString()}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
