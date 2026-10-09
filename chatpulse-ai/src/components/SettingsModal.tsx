import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette, Type, Bell, Terminal, Save } from 'lucide-react';
import { useToast } from './Toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  keywords: string;
  onKeywordsChange: (keywords: string) => void;
  ollamaModel: string;
  onOllamaModelChange: (model: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, isDark, onToggleTheme,
  systemPrompt, onSystemPromptChange,
  keywords, onKeywordsChange,
  ollamaModel, onOllamaModelChange
}) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<'general' | 'prompts' | 'alerts'>('general');

  const handleSave = () => {
    toast('success', 'Settings Saved', 'Your preferences have been updated.');
    onClose();
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Palette size={14} /> },
    { id: 'prompts', label: 'Prompts', icon: <Terminal size={14} /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell size={14} /> },
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-6">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="p-6 max-h-[400px] overflow-y-auto">
              {tab === 'general' && (
                <div className="space-y-6">
                  {/* Theme */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 block">
                      Theme
                    </label>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {isDark ? 'Dark Mode' : 'Light Mode'}
                      </span>
                      <button
                        onClick={onToggleTheme}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          isDark ? 'bg-violet-500' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            isDark ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Ollama Model */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                      Ollama Model Name
                    </label>
                    <input
                      type="text"
                      value={ollamaModel}
                      onChange={(e) => onOllamaModelChange(e.target.value)}
                      placeholder="llama3"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {tab === 'prompts' && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                    Custom System Prompt Override
                  </label>
                  <p className="text-xs text-slate-400 mb-3">
                    Leave empty to use the default structured-JSON extraction prompt.
                  </p>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => onSystemPromptChange(e.target.value)}
                    placeholder="Override the system prompt sent to the LLM..."
                    className="w-full h-48 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                  />
                </div>
              )}

              {tab === 'alerts' && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                    High-Priority Keywords
                  </label>
                  <p className="text-xs text-slate-400 mb-3">
                    Comma-separated keywords. Messages containing these will be flagged as high urgency.
                  </p>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => onKeywordsChange(e.target.value)}
                    placeholder="urgent, ASAP, deadline, blocker, critical"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Save size={14} />
                Save Settings
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
