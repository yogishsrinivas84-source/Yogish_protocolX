import React, { useState, useRef, useCallback } from 'react';
import Avatar from 'boring-avatars';
import { UploadCloud, MessageSquare, Clock, Trash2, FileText, Search, User, Filter, Eye, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEngine } from '../context/EngineContext';
import { db, ChatSession } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { parseChat, messagesToPromptText, readFileAsText } from '../parsers/ChatParser';
import { useToast } from './Toast';
import { MagneticButton } from './MagneticButton';
import { ContextMiniMap } from './ContextMiniMap';

interface LeftPanelProps {
  onSessionSelect: (id: string) => void;
  activeSessionId: string | null;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({ onSessionSelect, activeSessionId }) => {
  const [tab, setTab] = useState<'paste' | 'upload'>('paste');
  const [text, setText] = useState('');
  const [context, setContext] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isReady, isProcessing, processChat } = useEngine();
  const { toast } = useToast();

  // Live query for session history
  const sessions = useLiveQuery(
    () => db.sessions.orderBy('createdAt').reverse().toArray(),
    []
  );

  const activeSession = sessions?.find((s) => s.id === activeSessionId);

  const handleProcess = async () => {
    if (!text.trim() || isProcessing) return;

    try {
      const { format, messages } = parseChat(text);
      const normalised = messagesToPromptText(messages);

      toast('info', 'Processing…', `Detected format: ${format} (${messages.length} messages)`);

      let fullContext = context || '';
      if (userFilter.trim()) {
        fullContext += `\nFocus on messages from or mentioning: ${userFilter}`;
      }

      const parsed = await processChat(normalised, fullContext);

      const newSession: ChatSession = {
        id: uuidv4(),
        title: `Analysis — ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        createdAt: Date.now(),
        rawText: text,
        parsedResult: parsed
      };

      await db.sessions.add(newSession);
      onSessionSelect(newSession.id);
      toast('success', 'Analysis Complete', `Extracted ${(parsed.action_items?.length || 0) + (parsed.decisions?.length || 0)} insights`);
    } catch (err: any) {
      console.error(err);
      toast('error', 'Processing Failed', err.message || String(err));
    }
  };

  // ── File handling ──────────────────────────────────────────────

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['txt', 'json', 'csv'].includes(ext || '')) {
        toast('warning', 'Unsupported File', `"${file.name}" is not a .txt, .json, or .csv file.`);
        continue;
      }
      try {
        const content = await readFileAsText(file);
        setText((prev) => (prev ? prev + '\n\n' + content : content));
        setTab('paste');
        toast('success', 'File Loaded', `${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      } catch (err: any) {
        toast('error', 'File Read Error', err.message);
      }
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.sessions.delete(id);
    if (activeSessionId === id) {
      onSessionSelect('');
    }
    toast('info', 'Session Deleted');
  };

  const scrollToLine = (lineIndex: number) => {
    if (!textareaRef.current) return;
    const lines = text.split('\n');
    let charOffset = 0;
    for (let i = 0; i < Math.min(lineIndex, lines.length); i++) {
      charOffset += lines[i].length + 1;
    }
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charOffset, charOffset + (lines[lineIndex]?.length || 0));
    const lineHeight = 20;
    textareaRef.current.scrollTop = lineIndex * lineHeight;
  };

  return (
    <div className="w-full md:w-[36%] h-full flex flex-col border-r border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-[#09090B]/60 backdrop-blur-xl z-10 relative font-sans">
      {/* Input Section */}
      <div className="p-5 border-b border-slate-200/80 dark:border-white/10 shrink-0">
        {/* Tabs with Layout ID animated indicator */}
        <div className="flex bg-slate-100 dark:bg-white/5 rounded-xl p-1 mb-4 border border-slate-200/80 dark:border-white/10 relative">
          <button
            onClick={() => setTab('paste')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all relative z-10 ${
              tab === 'paste'
                ? 'text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
            }`}
          >
            {tab === 'paste' && (
              <motion.div
                layoutId="inputTabIndicator"
                className="absolute inset-0 bg-white dark:bg-white/10 rounded-lg shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center space-x-1.5">
              <FileText size={13} />
              <span>Direct Paste</span>
            </span>
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all relative z-10 ${
              tab === 'upload'
                ? 'text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
            }`}
          >
            {tab === 'upload' && (
              <motion.div
                layoutId="inputTabIndicator"
                className="absolute inset-0 bg-white dark:bg-white/10 rounded-lg shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center space-x-1.5">
              <UploadCloud size={13} />
              <span>File Upload</span>
            </span>
          </button>
        </div>

        {/* Input area with Context Mini-Map overlay and AI wave shimmer when processing */}
        {tab === 'paste' ? (
          <div className="relative group">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Paste raw chat logs here...\n\nSupported formats:\n• Slack JSON exports\n• WhatsApp chat exports\n• Discord text logs\n• Generic 'Name: Message' logs"}
              className={`w-full h-44 bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 text-xs focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none resize-none placeholder-slate-400 dark:placeholder-zinc-600 font-mono leading-relaxed transition-all ${
                isProcessing ? 'animate-ai-wave border-violet-500/50 ring-2 ring-violet-500/30' : ''
              }`}
            />
            {/* Context Mini-Map heatmap */}
            <ContextMiniMap
              rawText={text}
              parsedResult={activeSession?.parsedResult}
              onSelectLine={scrollToLine}
            />
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-44 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              isDragging
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/50 hover:bg-slate-100 dark:hover:bg-zinc-900/60'
            }`}
          >
            <UploadCloud size={34} className={`mb-2 ${isDragging ? 'text-violet-500' : 'text-zinc-500'}`} />
            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              {isDragging ? 'Drop file to load' : 'Drag & drop chat log files or click to browse'}
            </span>
            <span className="text-[10px] mt-1 text-slate-400 dark:text-zinc-500 font-mono">Supports .txt, .json, .csv</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.json,.csv"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>
        )}

        {/* Filters Grid */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 block font-mono flex items-center space-x-1">
              <User size={10} />
              <span>User Focus</span>
            </label>
            <input
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="e.g. @john"
              className="w-full bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-violet-500 outline-none font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 block font-mono flex items-center space-x-1">
              <Filter size={10} />
              <span>Extra Context</span>
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. Sprint Goals"
              className="w-full bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-violet-500 outline-none font-mono"
            />
          </div>
        </div>

        {/* Magnetic Process Button */}
        <MagneticButton
          onClick={handleProcess}
          disabled={!isReady || isProcessing || !text.trim()}
          className={`mt-4 w-full text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2.5 shadow-lg ${
            isReady && text.trim() && !isProcessing
              ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 hover:from-violet-500 hover:to-fuchsia-500 neon-glow-violet shadow-violet-500/20'
              : 'bg-slate-300 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <>
              <span className="w-4 h-4 rounded-full bg-white/20 border-2 border-white/40 border-t-white animate-spin" />
              <span className="font-display">AI Processing Log…</span>
            </>
          ) : (
            <>
              <Sparkles size={18} className="text-violet-200" />
              <span className="font-display font-bold text-sm tracking-wide">Process Conversation</span>
            </>
          )}
        </MagneticButton>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
            Recent Analyses ({sessions?.length || 0})
          </h3>
        </div>

        {(!sessions || sessions.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3 border border-slate-200 dark:border-white/10">
              <FileText size={20} className="text-slate-400 dark:text-zinc-500" />
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs">
              No analysis history yet. Paste or upload a chat log above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence>
              {sessions.map((s) => {
                const isActive = activeSessionId === s.id;
                const urgency = s.parsedResult?.overall_urgency;

                return (
                  <motion.button
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    onClick={() => onSessionSelect(s.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all group relative overflow-hidden ${
                      isActive
                        ? 'bg-violet-500/10 dark:bg-violet-950/30 border-violet-500/40 shadow-lg shadow-violet-500/5'
                        : 'bg-white/70 dark:bg-zinc-900/40 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        {/* Avatar representation based on session title */}
                        <div className="shrink-0">
                          <Avatar
                            size={28}
                            name={s.title}
                            variant="beam"
                            colors={["#7C3AED", "#059669", "#3B82F6", "#F59E0B", "#EC4899"]}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate font-sans">
                            {s.title}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Clock size={10} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                              {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Redefined Urgency Glowing Dot Badge */}
                      {urgency && (
                        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              urgency === 'High'
                                ? 'bg-red-500 neon-glow-red animate-pulse'
                                : urgency === 'Medium'
                                ? 'bg-amber-400 neon-glow-amber'
                                : 'bg-emerald-400 neon-glow-emerald'
                            }`}
                          />
                          <span className="text-[9px] font-mono text-slate-500 dark:text-zinc-400 uppercase font-semibold">
                            {urgency}
                          </span>
                        </div>
                      )}

                      <button
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2"
                        aria-label="Delete session"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
