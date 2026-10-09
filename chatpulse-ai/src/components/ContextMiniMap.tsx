import React, { useMemo } from 'react';
import { ParsedAnalysis } from '../db';

interface ContextMiniMapProps {
  rawText: string;
  parsedResult?: ParsedAnalysis | null;
  onSelectLine?: (lineIndex: number) => void;
}

interface MiniMapTick {
  id: string;
  lineIndex: number;
  percentage: number;
  type: 'urgency' | 'decision' | 'alert' | 'deadline';
  label: string;
}

export const ContextMiniMap: React.FC<ContextMiniMapProps> = ({
  rawText,
  parsedResult,
  onSelectLine,
}) => {
  const ticks = useMemo<MiniMapTick[]>(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split('\n');
    const totalLines = Math.max(lines.length, 1);
    const resultTicks: MiniMapTick[] = [];

    if (!parsedResult) {
      // Fallback keyword-based detection if analysis result isn't generated yet
      lines.forEach((line, idx) => {
        const lower = line.toLowerCase();
        const percentage = (idx / totalLines) * 100;
        if (lower.includes('urgent') || lower.includes('asap') || lower.includes('critical') || lower.includes('bug')) {
          resultTicks.push({
            id: `kwd-${idx}`,
            lineIndex: idx,
            percentage,
            type: 'urgency',
            label: `High Urgency: "${line.slice(0, 40)}..."`,
          });
        } else if (lower.includes('agreed') || lower.includes('decided') || lower.includes('approved')) {
          resultTicks.push({
            id: `kwd-${idx}`,
            lineIndex: idx,
            percentage,
            type: 'decision',
            label: `Decision: "${line.slice(0, 40)}..."`,
          });
        }
      });
      return resultTicks;
    }

    // Match extracted items to source lines
    const matchLine = (sourceQuote: string) => {
      if (!sourceQuote) return -1;
      const snippet = sourceQuote.slice(0, 25).toLowerCase();
      return lines.findIndex((l) => l.toLowerCase().includes(snippet));
    };

    parsedResult.action_items?.forEach((item) => {
      const idx = matchLine(item.source_quote);
      if (idx !== -1) {
        resultTicks.push({
          id: item.id || `act-${idx}`,
          lineIndex: idx,
          percentage: (idx / totalLines) * 100,
          type: 'urgency',
          label: `[${item.urgency || 'High'}] ${item.task.slice(0, 40)}`,
        });
      }
    });

    parsedResult.decisions?.forEach((item) => {
      const idx = matchLine(item.source_quote);
      if (idx !== -1) {
        resultTicks.push({
          id: item.id || `dec-${idx}`,
          lineIndex: idx,
          percentage: (idx / totalLines) * 100,
          type: 'decision',
          label: `[Decision] ${item.decision.slice(0, 40)}`,
        });
      }
    });

    parsedResult.mentions_and_alerts?.forEach((item) => {
      const idx = matchLine(item.source_quote);
      if (idx !== -1) {
        resultTicks.push({
          id: item.id || `alt-${idx}`,
          lineIndex: idx,
          percentage: (idx / totalLines) * 100,
          type: 'alert',
          label: `[Alert] ${item.context.slice(0, 40)}`,
        });
      }
    });

    return resultTicks;
  }, [rawText, parsedResult]);

  if (ticks.length === 0) return null;

  return (
    <div
      className="absolute top-0 right-1 bottom-0 w-3 z-10 flex flex-col justify-between pointer-events-auto py-2 group/minimap"
      title="Context Mini-Map Heatmap"
    >
      <div className="w-full h-full relative bg-slate-200/30 dark:bg-zinc-800/30 rounded-full backdrop-blur-xs border border-white/5">
        {ticks.map((tick) => {
          let bgClass = 'bg-red-500 neon-glow-red';
          if (tick.type === 'decision') bgClass = 'bg-emerald-400 neon-glow-emerald';
          if (tick.type === 'alert') bgClass = 'bg-amber-400 neon-glow-amber';
          if (tick.type === 'deadline') bgClass = 'bg-blue-400 shadow-[0_0_6px_#3b82f6]';

          return (
            <button
              key={tick.id}
              onClick={() => onSelectLine?.(tick.lineIndex)}
              style={{ top: `${Math.min(Math.max(tick.percentage, 2), 96)}%` }}
              className={`absolute right-0.5 w-2.5 h-1.5 rounded-full cursor-pointer transition-transform hover:scale-150 ${bgClass}`}
            >
              {/* Tooltip on hover */}
              <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-zinc-900 text-zinc-100 text-[10px] rounded shadow-lg opacity-0 group-hover/minimap:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 font-mono">
                {tick.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
