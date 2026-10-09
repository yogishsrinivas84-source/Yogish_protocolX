import Dexie, { Table } from 'dexie';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  rawText: string;
  parsedResult?: ParsedAnalysis;
}

export interface ParsedAnalysis {
  summary: string[];
  overall_urgency: 'High' | 'Medium' | 'Low';
  action_items: Array<{
    id: string;
    task: string;
    assignee: string;
    urgency: 'High' | 'Medium' | 'Low';
    source_quote: string;
  }>;
  decisions: Array<{
    id: string;
    decision: string;
    made_by: string;
    source_quote: string;
  }>;
  mentions_and_alerts: Array<{
    id: string;
    target: string;
    context: string;
    urgency: 'High' | 'Medium' | 'Low';
    source_quote: string;
  }>;
  deadlines: Array<{
    id: string;
    due_date: string;
    task: string;
    source_quote: string;
  }>;
}

export class ChatPulseDB extends Dexie {
  sessions!: Table<ChatSession>;

  constructor() {
    super('ChatPulseDB');
    this.version(1).stores({
      sessions: 'id, createdAt' // Primary key and indexed props
    });
  }
}

export const db = new ChatPulseDB();
