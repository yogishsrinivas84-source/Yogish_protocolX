import React, { useState, useEffect, useCallback } from 'react';
import { EngineProvider } from './context/EngineContext';
import { TopNav } from './components/TopNav';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { SettingsModal } from './components/SettingsModal';
import { ToastProvider } from './components/Toast';
import { CommandPalette } from './components/CommandPalette';
import { ChatSession, db } from './db';
import { useLiveQuery } from 'dexie-react-hooks';

const ChatPulseApp: React.FC = () => {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [keywords, setKeywords] = useState('');
  const [ollamaModel, setOllamaModel] = useState('llama3');

  // Live query all sessions for command palette
  const sessions = useLiveQuery(
    () => db.sessions.orderBy('createdAt').reverse().toArray(),
    []
  );

  // Theme management - Default to Dark Midnight Aurora theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark((prev) => !prev), []);

  // Load active session from IndexedDB when selected
  useEffect(() => {
    if (activeSessionId) {
      db.sessions.get(activeSessionId).then((session) => {
        if (session) setActiveSession(session);
      });
    } else {
      setActiveSession(null);
    }
  }, [activeSessionId]);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ToastProvider>
      <EngineProvider>
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 relative font-sans">
          {/* Ambient Glow Mesh Gradients (Fixed Background) */}
          <div className="fixed top-0 left-0 w-96 h-96 bg-violet-600/15 rounded-full blur-[140px] pointer-events-none z-0" />
          <div className="fixed top-0 right-0 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[160px] pointer-events-none z-0" />
          <div className="fixed bottom-0 right-0 w-[30rem] h-[30rem] bg-emerald-500/15 rounded-full blur-[150px] pointer-events-none z-0" />
          <div className="fixed bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none z-0" />

          {/* Top Navigation */}
          <TopNav
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenCmdk={() => setCmdkOpen(true)}
          />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
            <LeftPanel
              onSessionSelect={setActiveSessionId}
              activeSessionId={activeSessionId}
            />
            <RightPanel
              session={activeSession}
              onOpenCmdk={() => setCmdkOpen(true)}
            />
          </main>

          {/* Command Palette (Cmd+K) */}
          <CommandPalette
            isOpen={cmdkOpen}
            onClose={() => setCmdkOpen(false)}
            activeSession={activeSession}
            sessions={sessions}
            onSelectSession={setActiveSessionId}
            onToggleTheme={toggleTheme}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          {/* Settings Modal */}
          <SettingsModal
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            systemPrompt={systemPrompt}
            onSystemPromptChange={setSystemPrompt}
            keywords={keywords}
            onKeywordsChange={setKeywords}
            ollamaModel={ollamaModel}
            onOllamaModelChange={setOllamaModel}
          />
        </div>
      </EngineProvider>
    </ToastProvider>
  );
};

export default ChatPulseApp;
