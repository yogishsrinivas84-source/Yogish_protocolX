/**
 * ChatParser — Unified ingestion engine that auto-detects and normalises
 * Slack JSON, WhatsApp export, Discord log, and generic text chat formats
 * into a canonical message array before LLM submission.
 */

export interface ParsedMessage {
  user: string;
  message: string;
  timestamp: string; // ISO-ish or original string
}

// ── Format detection ─────────────────────────────────────────────

type ChatFormat = 'slack' | 'whatsapp' | 'discord' | 'generic';

function detectFormat(raw: string): ChatFormat {
  const trimmed = raw.trim();

  // Slack JSON: array of objects with "user", "text", "ts"
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed.startsWith('{') ? `[${trimmed}]` : trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && 'text' in parsed[0] && ('user' in parsed[0] || 'username' in parsed[0])) {
        return 'slack';
      }
    } catch {
      // not valid JSON — fall through
    }
  }

  // WhatsApp: [DD/MM/YY, HH:MM:SS] Name: Message  OR  DD/MM/YYYY, HH:MM - Name: Message
  if (/\[\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}(:\d{2})?\]/.test(trimmed)) {
    return 'whatsapp';
  }
  // alt WhatsApp (no brackets)
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}\s-\s/.test(trimmed)) {
    return 'whatsapp';
  }

  // Discord: "Username — MM/DD/YYYY HH:MM" or "Username — Today at HH:MM"
  if (/^.+\s[—–-]\s\d{1,2}\/\d{1,2}\/\d{2,4}\s\d{1,2}:\d{2}/m.test(trimmed)) {
    return 'discord';
  }

  return 'generic';
}

// ── Format-specific parsers ──────────────────────────────────────

function parseSlack(raw: string): ParsedMessage[] {
  try {
    const data = JSON.parse(raw.trim().startsWith('{') ? `[${raw.trim()}]` : raw.trim());
    return data.map((msg: any) => ({
      user: msg.user || msg.username || msg.user_profile?.display_name || 'Unknown',
      message: msg.text || '',
      timestamp: msg.ts
        ? new Date(Number(msg.ts) * 1000).toISOString()
        : ''
    }));
  } catch {
    return [{ user: 'Unknown', message: raw, timestamp: '' }];
  }
}

function parseWhatsApp(raw: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];

  // Pattern 1: [DD/MM/YY, HH:MM:SS] Name: Message
  const bracketRegex = /\[(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}(?::\d{2})?)\]\s([^:]+):\s([\s\S]*?)(?=\[\d{1,2}\/|$)/g;
  // Pattern 2: DD/MM/YYYY, HH:MM - Name: Message
  const dashRegex = /(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2})\s-\s([^:]+):\s([\s\S]*?)(?=\d{1,2}\/\d{1,2}\/\d{2,4},|$)/g;

  let match: RegExpExecArray | null;
  let used = false;

  // Try bracket format first
  while ((match = bracketRegex.exec(raw)) !== null) {
    used = true;
    messages.push({
      timestamp: match[1],
      user: match[2].trim(),
      message: match[3].trim()
    });
  }

  if (!used) {
    while ((match = dashRegex.exec(raw)) !== null) {
      messages.push({
        timestamp: match[1],
        user: match[2].trim(),
        message: match[3].trim()
      });
    }
  }

  if (messages.length === 0) {
    return [{ user: 'Unknown', message: raw, timestamp: '' }];
  }

  return messages;
}

function parseDiscord(raw: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  // Split on lines that start with "Username — date"
  const blocks = raw.split(/(?=^.+\s[—–-]\s\d{1,2}\/\d{1,2}\/\d{2,4}\s\d{1,2}:\d{2})/m);

  for (const block of blocks) {
    const headerMatch = block.match(/^(.+?)\s[—–-]\s(\d{1,2}\/\d{1,2}\/\d{2,4}\s\d{1,2}:\d{2})\s*\n([\s\S]*)/);
    if (headerMatch) {
      messages.push({
        user: headerMatch[1].trim(),
        timestamp: headerMatch[2].trim(),
        message: headerMatch[3].trim()
      });
    }
  }

  if (messages.length === 0) {
    return [{ user: 'Unknown', message: raw, timestamp: '' }];
  }

  return messages;
}

function parseGeneric(raw: string): ParsedMessage[] {
  // Best-effort: split on blank lines or lines that look like "Name: message"
  const messages: ParsedMessage[] = [];
  const lines = raw.split('\n');
  const colonPattern = /^([^:]{1,30}):\s(.+)/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(colonPattern);
    if (match) {
      messages.push({
        user: match[1].trim(),
        message: match[2].trim(),
        timestamp: ''
      });
    } else {
      // Append to last message or create anonymous
      if (messages.length > 0) {
        messages[messages.length - 1].message += '\n' + trimmed;
      } else {
        messages.push({ user: 'Unknown', message: trimmed, timestamp: '' });
      }
    }
  }

  return messages;
}

// ── Public API ───────────────────────────────────────────────────

export function parseChat(raw: string): { format: ChatFormat; messages: ParsedMessage[] } {
  const format = detectFormat(raw);

  let messages: ParsedMessage[];
  switch (format) {
    case 'slack':
      messages = parseSlack(raw);
      break;
    case 'whatsapp':
      messages = parseWhatsApp(raw);
      break;
    case 'discord':
      messages = parseDiscord(raw);
      break;
    default:
      messages = parseGeneric(raw);
  }

  return { format, messages };
}

/**
 * Convert parsed messages back into a normalised text block
 * suitable for LLM consumption. This ensures the LLM always
 * receives a consistent input regardless of source format.
 */
export function messagesToPromptText(messages: ParsedMessage[]): string {
  return messages
    .map((m) => {
      const ts = m.timestamp ? `[${m.timestamp}] ` : '';
      return `${ts}${m.user}: ${m.message}`;
    })
    .join('\n');
}

/**
 * Read a File object and return its text content.
 * Supports .txt, .json, .csv
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
  });
}
