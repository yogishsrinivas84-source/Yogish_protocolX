# ChatPulse AI: Intelligence Pipeline & Prompts

ChatPulse AI is a local-first application designed to extract structured intelligence from raw chat transcripts entirely on-device. This document outlines the primary System Prompts and the fallback parsing rules powering the application.

## 1. Primary AI System Prompt (WebLLM - Llama 3.2 1B)

Because we utilize ultra-lightweight on-device models (e.g., Llama 3.2 1B), standard abstract schemas tend to confuse the model. Instead of describing the schema rules, we use a **One-Shot Concrete Example Prompt**. Small models perform exceptionally well when given a direct example to mimic.

```text
Analyze chat logs and output JSON. Here is an example:

Input: "Alice: We need to finish the report by Friday. Bob: Got it, I'll handle the charts. Alice: Let's use Google Slides."

Output: {"summary":["Team discussing report deadline","Bob will handle charts","Using Google Slides"],"overall_urgency":"Medium","action_items":[{"id":"a1","task":"Finish the report by Friday","assignee":"Alice","urgency":"Medium","source_quote":"We need to finish the report by Friday"},{"id":"a2","task":"Handle the charts","assignee":"Bob","urgency":"Medium","source_quote":"I'll handle the charts"}],"decisions":[{"id":"d1","decision":"Use Google Slides for the report","made_by":"Alice","source_quote":"Let's use Google Slides"}],"mentions_and_alerts":[],"deadlines":[{"id":"dl1","due_date":"Friday","task":"Finish the report","source_quote":"finish the report by Friday"}]}

Now analyze this chat. Output ONLY valid JSON, nothing else:
```

### JSON Auto-Repair

After the LLM generates the output, the worker pipeline automatically applies the following repairs before attempting to parse:
1. Strips any markdown fences (e.g., ` ```json `).
2. Extracts only the outermost `{ ... }` block.
3. Automatically repairs common small-model syntax errors, such as missing commas or extraneous key-value mappings inside arrays.

---

## 2. Rule-Based Fallback Parser (Heuristics)

If the user's GPU hangs, the LLM hallucinates, or the JSON parsing completely fails, ChatPulse AI seamlessly fails over to a deterministic heuristic parser. This guarantees the user always receives a populated report.

**Action Item Keywords:**
`(todo|action|need to|should|must|please|asap|urgent|fix|send|update|review|check|follow up|complete|deliver|submit|remind|schedule)`

**Decision Keywords:**
`(decided|agreed|confirmed|approved|finalized|let's go with|we'll use|going with|settled on)`

**Deadline Keywords:**
`(deadline|due|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|end of day|eod|eow|next week)|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})`

**Fallback Logic:**
1. The parser splits the chat by lines and identifies speakers.
2. It tests each line against the above Regex patterns.
3. If a match is found, it extracts the speaker, quotes the line, and categorizes it into the exact same JSON schema structure as the LLM.
4. Urgency is determined dynamically if words like "asap", "urgent", or "critical" are present.
