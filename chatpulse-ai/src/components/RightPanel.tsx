import React, { useState } from 'react';
import Avatar from 'boring-avatars';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, AlertCircle, Clock, Copy, Check, X, Search, Eye, EyeOff, Sparkles, Command } from 'lucide-react';
import { ChatSession, ParsedAnalysis } from '../db';
import { useToast } from './Toast';
import { IsometricInboxIllustration } from './IsometricInboxIllustration';

interface RightPanelProps {
  session: ChatSession | null;
  onOpenCmdk?: () => void;
}

type TabId = 'action_items' | 'decisions' | 'mentions_and_alerts' | 'deadlines';

// Redefined Urgency Dot component with neon glowing shadow
const UrgencyBadge = ({ level }: { level: 'High' | 'Medium' | 'Low' }) => {
  const isHigh = level === 'High';
  const isMedium = level === 'Medium';

  return (
    <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
      <span
        className={`w-2 h-2 rounded-full ${
          isHigh
            ? 'bg-red-500 neon-glow-red animate-pulse'
            : isMedium
            ? 'bg-amber-400 neon-glow-amber'
            : 'bg-emerald-400 neon-glow-emerald'
        }`}
      />
      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-300">
        {level} Priority
      </span>
    </div>
  );
};

type FeedItem =
  | ParsedAnalysis['action_items'][number]
  | ParsedAnalysis['decisions'][number]
  | ParsedAnalysis['mentions_and_alerts'][number]
  | ParsedAnalysis['deadlines'][number];

export const RightPanel: React.FC<RightPanelProps> = ({ session, onOpenCmdk }) => {
  const [activeTab, setActiveTab] = useState<TabId>('action_items');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // ── Empty State ──────────────────────────────────────────────

  if (!session || !session.parsedResult) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-[#09090B]/30 p-8 text-center relative overflow-hidden font-sans">
        {/* Ambient Mesh Glow background */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

        <IsometricInboxIllustration />

        <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-white mt-4 mb-2">
          No Conversation Selected
        </h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md leading-relaxed mb-6 font-sans">
          Paste a chat transcript on the left or press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded border border-slate-300 dark:border-zinc-700">⌘K</kbd> to search past intelligence sessions.
        </p>

        {onOpenCmdk && (
          <button
            onClick={onOpenCmdk}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 transition-all text-xs font-semibold"
          >
            <Command size={14} />
            <span>Open Command Palette (⌘K)</span>
          </button>
        )}
      </div>
    );
  }

  const { parsedResult } = session;

  // ── Tabs ─────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'action_items', label: 'Action Items', icon: <Target size={14} />, count: parsedResult.action_items?.length || 0 },
    { id: 'decisions', label: 'Decisions', icon: <CheckCircle2 size={14} />, count: parsedResult.decisions?.length || 0 },
    { id: 'mentions_and_alerts', label: 'Alerts', icon: <AlertCircle size={14} />, count: parsedResult.mentions_and_alerts?.length || 0 },
    { id: 'deadlines', label: 'Deadlines', icon: <Clock size={14} />, count: parsedResult.deadlines?.length || 0 },
  ];

  // ── Quick actions ────────────────────────────────────────────

  const handleCopy = async (item: FeedItem) => {
    const text = ('task' in item ? item.task : 'decision' in item ? item.decision : 'context' in item ? item.context : '');
    try {
      await navigator.clipboard.writeText(text);
      toast('success', 'Copied to Clipboard', 'Text copied successfully.');
    } catch {
      toast('error', 'Copy Failed', 'Browser denied clipboard access.');
    }
  };

  const handleComplete = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    toast('success', completedIds.has(id) ? 'Marked Incomplete' : 'Marked Complete');
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    toast('info', 'Item Dismissed');
  };

  // ── Feed rendering ───────────────────────────────────────────

  const getItems = (): FeedItem[] => {
    switch (activeTab) {
      case 'action_items': return parsedResult.action_items || [];
      case 'decisions': return parsedResult.decisions || [];
      case 'mentions_and_alerts': return parsedResult.mentions_and_alerts || [];
      case 'deadlines': return parsedResult.deadlines || [];
    }
  };

  const visibleItems = getItems().filter((item) => !dismissedIds.has(item.id));

  const renderCard = (item: FeedItem, idx: number) => {
    const itemId = item.id || String(idx);
    const isCompleted = completedIds.has(itemId);
    const title = 'task' in item ? item.task : 'decision' in item ? item.decision : 'context' in item ? item.context : '';
    const urgency = 'urgency' in item ? item.urgency : undefined;
    const author = 'assignee' in item ? item.assignee : 'made_by' in item ? item.made_by : 'target' in item ? item.target : undefined;

    return (
      <motion.div
        key={itemId}
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 }
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpandedId(expandedId === itemId ? null : itemId);
          }
        }}
        className={`glass-card glass-card-hover rounded-2xl p-5 shadow-sm transition-all group focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
          isCompleted ? 'opacity-50' : ''
        }`}
      >
        {/* Header row */}
        <div className="flex justify-between items-start mb-3 gap-3">
          <div className="flex flex-col space-y-2 flex-1 min-w-0">
            {urgency && <UrgencyBadge level={urgency} />}
            <h4 className={`font-display font-semibold text-base leading-snug ${
              isCompleted
                ? 'line-through text-slate-400 dark:text-zinc-600'
                : 'text-slate-900 dark:text-zinc-100'
            }`}>
              {title}
            </h4>
          </div>

          {/* Quick Actions */}
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => handleCopy(item)}
              className="p-2 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
              title="Copy text (c)"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => handleComplete(itemId)}
              className={`p-2 rounded-lg transition-colors ${
                isCompleted
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
              }`}
              title={isCompleted ? 'Unmark complete' : 'Mark complete (m)'}
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => handleDismiss(itemId)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Dismiss (d)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Metadata Pills with Procedural Avatars */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {author && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium">
              <Avatar
                size={16}
                name={author}
                variant="beam"
                colors={["#7C3AED", "#059669", "#3B82F6", "#F59E0B"]}
              />
              <span className="font-mono text-[11px]">@{author}</span>
            </div>
          )}

          {'due_date' in item && item.due_date && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-mono">
              <Clock size={12} />
              <span>Due: {item.due_date}</span>
            </div>
          )}
        </div>

        {/* Source Quote Accordion */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5">
          <button
            onClick={() => setExpandedId(expandedId === itemId ? null : itemId)}
            className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center space-x-1.5 transition-colors"
          >
            {expandedId === itemId ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>{expandedId === itemId ? 'Hide Context' : 'View Source Transcript'}</span>
          </button>
          <AnimatePresence>
            {expandedId === itemId && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2.5 p-3.5 bg-slate-900/90 dark:bg-black/60 rounded-xl border border-white/10 text-xs font-mono text-zinc-300 leading-relaxed">
                  "{item.source_quote}"
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  // ── Main Render ──────────────────────────────────────────────

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50/50 dark:bg-[#09090B]/40 overflow-hidden font-sans relative">
      {/* Background ambient mesh glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Executive Summary Header */}
      <div className="p-6 shrink-0 bg-white/70 dark:bg-[#09090B]/60 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              Executive Summary
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
              AI Synthesized
            </span>
          </div>
          <UrgencyBadge level={parsedResult.overall_urgency || 'Low'} />
        </div>

        {/* Staggered summary list */}
        <motion.ul
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
          }}
          className="space-y-2.5"
        >
          {parsedResult.summary?.map((bullet, idx) => (
            <motion.li
              key={idx}
              variants={{
                hidden: { opacity: 0, x: -12 },
                visible: { opacity: 1, x: 0 }
              }}
              className="flex items-start space-x-3 text-sm text-slate-700 dark:text-zinc-300 leading-relaxed font-sans"
            >
              <Sparkles size={14} className="text-violet-400 mt-1 shrink-0" />
              <span>{bullet}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* Category Tabs with Animated layoutId Indicator */}
      <div className="px-6 pt-3 shrink-0 flex space-x-2 overflow-x-auto scrollbar-hide border-b border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-[#09090B]/40 z-10">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`relative flex items-center space-x-2 px-4 py-3 text-xs font-semibold transition-all rounded-t-xl whitespace-nowrap ${
                isActive
                  ? 'text-violet-600 dark:text-violet-300'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="rightPanelActiveTab"
                  className="absolute inset-0 bg-violet-500/10 dark:bg-violet-600/20 border-b-2 border-violet-500 rounded-t-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center space-x-2">
                <span>{t.icon}</span>
                <span>{t.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-zinc-400'
                }`}>
                  {t.count}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Feed with Staggered Reveal Cards */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide z-10">
        {visibleItems.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3 border border-white/10">
              <Search size={20} className="text-zinc-500" />
            </div>
            <p className="text-sm font-sans text-slate-500 dark:text-zinc-400">
              No items in this category.
            </p>
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
            className="space-y-3.5"
          >
            {visibleItems.map((item, idx) => renderCard(item, idx))}
          </motion.div>
        )}
      </div>
    </div>
  );
};
