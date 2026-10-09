import { CreateMLCEngine, InitProgressReport, MLCEngineInterface } from "@mlc-ai/web-llm";
import { ParsedAnalysis } from "../db";

let engine: MLCEngineInterface | null = null;
let currentModel = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

// ────────────────────────────────────────────────────────────────
// RULE-BASED FALLBACK PARSER
// If the LLM completely fails, we extract what we can heuristically.
// ────────────────────────────────────────────────────────────────
function ruleBasedParse(chatText: string): ParsedAnalysis {
  const lines = chatText.split('\n').filter(l => l.trim());
  const people = new Set<string>();
  const actionKeywords = /\b(todo|action|need to|should|must|please|asap|urgent|fix|send|update|review|check|follow up|complete|deliver|submit|remind|schedule)\b/i;
  const deadlineKeywords = /\b(deadline|due|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|end of day|eod|eow|next week)|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/i;
  const decisionKeywords = /\b(decided|agreed|confirmed|approved|finalized|let'?s go with|we'?ll use|going with|settled on)\b/i;

  const summaryBullets: string[] = [];
  const actionItems: ParsedAnalysis['action_items'] = [];
  const decisions: ParsedAnalysis['decisions'] = [];
  const mentions: ParsedAnalysis['mentions_and_alerts'] = [];
  const deadlines: ParsedAnalysis['deadlines'] = [];
  let hasUrgent = false;

  // Extract person names from "Name:" patterns
  for (const line of lines) {
    const nameMatch = line.match(/^(?:\[.*?\]\s*)?([^:\[\]]{1,25}):\s/);
    if (nameMatch) {
      people.add(nameMatch[1].trim());
    }
  }

  let actionCount = 0;
  let decisionCount = 0;
  let mentionCount = 0;
  let deadlineCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) continue;

    // Extract the message part (after "Name: ")
    const msgMatch = trimmed.match(/^(?:\[.*?\]\s*)?(?:[^:]{1,25}):\s*(.+)/);
    const msg = msgMatch ? msgMatch[1] : trimmed;
    const speaker = trimmed.match(/^(?:\[.*?\]\s*)?([^:]{1,25}):/)?.[1]?.trim() || '';

    if (actionKeywords.test(msg)) {
      actionCount++;
      actionItems.push({
        id: `a${actionCount}`,
        task: msg,
        assignee: speaker,
        urgency: /\b(asap|urgent|immediately|critical)\b/i.test(msg) ? 'High' : 'Medium',
        source_quote: trimmed.substring(0, 120)
      });
      if (/\b(asap|urgent|immediately|critical)\b/i.test(msg)) hasUrgent = true;
    }

    if (decisionKeywords.test(msg)) {
      decisionCount++;
      decisions.push({
        id: `d${decisionCount}`,
        decision: msg,
        made_by: speaker,
        source_quote: trimmed.substring(0, 120)
      });
    }

    if (deadlineKeywords.test(msg)) {
      deadlineCount++;
      const dateMatch = msg.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|tomorrow|monday|tuesday|wednesday|thursday|friday|end of day|eod|eow|next week)/i);
      deadlines.push({
        id: `dl${deadlineCount}`,
        due_date: dateMatch ? dateMatch[1] : 'unspecified',
        task: msg,
        source_quote: trimmed.substring(0, 120)
      });
    }
  }

  // Generate @mentions for each person detected
  for (const person of people) {
    mentionCount++;
    mentions.push({
      id: `m${mentionCount}`,
      target: person,
      context: `Active participant in the conversation`,
      urgency: 'Low',
      source_quote: ''
    });
  }

  // Build summary
  summaryBullets.push(`Conversation between ${people.size > 0 ? Array.from(people).join(', ') : 'unknown participants'} with ${lines.length} messages.`);
  if (actionItems.length > 0) summaryBullets.push(`${actionItems.length} action item(s) detected.`);
  if (decisions.length > 0) summaryBullets.push(`${decisions.length} decision(s) identified.`);
  if (deadlines.length > 0) summaryBullets.push(`${deadlines.length} deadline(s) found.`);
  if (actionItems.length === 0 && decisions.length === 0) {
    summaryBullets.push('Casual conversation — no critical action items detected.');
  }

  return {
    summary: summaryBullets,
    overall_urgency: hasUrgent ? 'High' : actionItems.length > 0 ? 'Medium' : 'Low',
    action_items: actionItems,
    decisions,
    mentions_and_alerts: mentions,
    deadlines
  };
}

// ────────────────────────────────────────────────────────────────
// JSON REPAIR — fix common small-model JSON mistakes
// ────────────────────────────────────────────────────────────────
function repairJson(raw: string): string {
  let s = raw;
  // Strip markdown fences
  s = s.replace(/^```[a-zA-Z]*\s*/gm, '').replace(/\s*```\s*$/gm, '').trim();
  // Extract outermost { ... }
  const m = s.match(/\{[\s\S]*\}/);
  if (m) s = m[0];
  // Fix "key": "value" pairs inside arrays that should be objects
  // e.g. "bullet point 1": "Link" → "Link"  (drop the key)
  s = s.replace(/"[^"]*"\s*:\s*"([^"]*)"/g, (match, val) => {
    // Only apply inside what looks like an array context — heuristic
    return `"${val}"`;
  });
  // Fix trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1');
  // Fix missing commas between } {
  s = s.replace(/\}\s*\{/g, '},{');
  return s;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  try {
    // ────────────────────────────────────────────────────────────────
    // INIT
    // ────────────────────────────────────────────────────────────────
    if (type === "INIT") {
      self.postMessage({ type: "PROGRESS", payload: "Downloading AI model… (first load may take a minute)" });

      const initProgressCallback = (report: InitProgressReport) => {
        self.postMessage({ type: "PROGRESS", payload: report.text });
      };

      try {
        engine = await CreateMLCEngine(currentModel, { initProgressCallback });
        self.postMessage({ type: "READY" });
      } catch (initErr: any) {
        const msg = initErr?.message || String(initErr);
        const friendly = msg.toLowerCase().includes('webgpu')
          ? "WebGPU is not supported in this browser. Please use Chrome or Edge."
          : `Engine init failed: ${msg}`;
        self.postMessage({ type: "ERROR", payload: friendly });
      }
    }

    // ────────────────────────────────────────────────────────────────
    // PROCESS
    // ────────────────────────────────────────────────────────────────
    else if (type === "PROCESS") {
      const { text, promptContext } = payload;

      if (!text?.trim()) {
        self.postMessage({ type: "ERROR", payload: "No chat text provided." });
        return;
      }

      if (!engine) {
        // No WebGPU engine — fall back to rule-based parsing immediately
        self.postMessage({ type: "PROGRESS", payload: "WebGPU unavailable — using rule-based analysis…" });
        const result = ruleBasedParse(text);
        self.postMessage({ type: "RESULT", payload: result });
        return;
      }

      self.postMessage({ type: "PROGRESS", payload: "Running AI analysis…" });

      // DRASTICALLY simplified prompt for 1B models — uses a concrete 
      // one-shot example instead of an abstract schema description.
      const systemPrompt = `Analyze chat logs and output JSON. Here is an example:

Input: "Alice: We need to finish the report by Friday. Bob: Got it, I'll handle the charts. Alice: Let's use Google Slides."

Output: {"summary":["Team discussing report deadline","Bob will handle charts","Using Google Slides"],"overall_urgency":"Medium","action_items":[{"id":"a1","task":"Finish the report by Friday","assignee":"Alice","urgency":"Medium","source_quote":"We need to finish the report by Friday"},{"id":"a2","task":"Handle the charts","assignee":"Bob","urgency":"Medium","source_quote":"I'll handle the charts"}],"decisions":[{"id":"d1","decision":"Use Google Slides for the report","made_by":"Alice","source_quote":"Let's use Google Slides"}],"mentions_and_alerts":[],"deadlines":[{"id":"dl1","due_date":"Friday","task":"Finish the report","source_quote":"finish the report by Friday"}]}

Now analyze this chat. Output ONLY valid JSON, nothing else:`;

      const userPrompt = `${text}${promptContext ? '\nContext: ' + promptContext : ''}`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: userPrompt }
      ];

      // 60-second timeout to prevent GPU hangs
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT")), 60000);
      });

      let resultText = "";
      try {
        const completionPromise = engine.chat.completions.create({
          messages,
          temperature: 0.1,
          max_tokens: 1500
        });

        const completion = await Promise.race([completionPromise, timeoutPromise]) as any;
        resultText = completion.choices[0].message.content || "";
      } catch (genErr: any) {
        console.warn("[ChatPulse Worker] LLM generation failed or timed out:", genErr);
        // Fall back to rule-based parsing
        self.postMessage({ type: "PROGRESS", payload: "AI timed out — using rule-based analysis…" });
        const result = ruleBasedParse(text);
        self.postMessage({ type: "RESULT", payload: result });
        return;
      }

      // ── Parse the LLM output ──
      let parsed: Partial<ParsedAnalysis> = {};
      let usedAI = false;

      if (resultText.trim()) {
        try {
          const repaired = repairJson(resultText);
          parsed = JSON.parse(repaired);
          usedAI = true;
        } catch (parseErr) {
          console.warn("[ChatPulse Worker] JSON parse failed even after repair. Raw:", resultText);
        }
      }

      // If AI parse failed or returned empty/template data, fall back to rules
      if (!usedAI || !parsed.summary || parsed.summary.length === 0 || 
          (parsed.summary[0] && parsed.summary[0].includes("bullet point"))) {
        console.info("[ChatPulse Worker] AI output was empty or template-like. Using rule-based fallback.");
        parsed = ruleBasedParse(text);
      }

      // Ensure all required fields are present
      const safeResult: ParsedAnalysis = {
        action_items: parsed.action_items ?? [],
        decisions: parsed.decisions ?? [],
        mentions_and_alerts: parsed.mentions_and_alerts ?? [],
        deadlines: parsed.deadlines ?? [],
        summary: parsed.summary ?? [],
        overall_urgency: parsed.overall_urgency ?? "Low"
      };

      self.postMessage({ type: "RESULT", payload: safeResult });
    }

  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error("[ChatPulse Worker] Unhandled error:", error);
    self.postMessage({ type: "ERROR", payload: msg });
  }
};
