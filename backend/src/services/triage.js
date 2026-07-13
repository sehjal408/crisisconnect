// ============================================================
// Week 9 — AI auto-triage layer
// ------------------------------------------------------------
// Scores an incoming citizen assistance request so the admin queue can be
// ordered by urgency. Produces three values (the columns the Week 5 schema
// already reserved): priority_score (0-100), ai_category, ai_summary.
//
// Design: HUMAN-IN-THE-LOOP. The output is only a SUGGESTION — an administrator
// still reviews, assigns, and resolves every request. The AI never dispatches.
//
// Robustness: a real Claude (Haiku) call is used when an API key is present;
// if there is no key, no network, or the call errors/times out, we fall back to
// a deterministic keyword heuristic. A request must NEVER fail to save because
// triage failed, so every path here returns a valid result and never throws.
// ============================================================

const MODEL = process.env.AI_MODEL || "claude-haiku-4-5";
const AI_ENABLED = (process.env.AI_TRIAGE || "on").toLowerCase() !== "off";
const API_KEY = process.env.ANTHROPIC_API_KEY || "";

// Base urgency by request type (before keyword adjustments).
const TYPE_BASE = {
  medical: 62, evacuation: 60, shelter: 42, transportation: 36,
  water: 46, food: 40, information: 15, other: 26,
};

// Keyword weights — scanned against the free-text description.
const CRITICAL = ["trapped", "unconscious", "not breathing", "can't breathe", "cant breathe",
  "cannot breathe", "bleeding", "heart attack", "cardiac", "stroke", "drowning", "collapsed",
  "oxygen", "seizure", "overdose", "gas leak", "chest pain", "no pulse", "choking"];
const HIGH = ["injured", "injury", "medical", "hospital", "medication", "insulin", "elderly",
  "senior", "disabled", "wheelchair", "child", "children", "baby", "infant", "pregnant",
  "evacuate", "evacuation", "fire", "flood", "smoke", "stranded", "no water", "dehydrated",
  "hypothermia", "diabetic"];
const MED = ["shelter", "food", "water", "transport", "ride", "blanket", "warm", "power",
  "electricity", "supplies", "clothing"];

function bandFor(score) {
  if (score >= 85) return "critical";
  if (score >= 60) return "urgent";
  if (score >= 30) return "standard";
  return "low";
}

function firstSentence(text, max = 200) {
  const s = (text || "").trim().replace(/\s+/g, " ");
  if (!s) return "No description provided.";
  const stop = s.search(/[.!?]\s/);
  const cut = stop > 20 ? s.slice(0, stop + 1) : s;
  return cut.length > max ? cut.slice(0, max - 1).trimEnd() + "…" : cut;
}

// -------- Deterministic keyword heuristic (offline, zero-cost, always works) --
function heuristicTriage({ request_type, description, affected_count }) {
  const text = (description || "").toLowerCase();
  let score = TYPE_BASE[request_type] != null ? TYPE_BASE[request_type] : 26;

  let critHits = 0;
  for (const w of CRITICAL) if (text.includes(w)) critHits++;
  for (const w of HIGH) if (text.includes(w)) score += 9;
  for (const w of MED) if (text.includes(w)) score += 3;
  score += Math.min(critHits, 3) * 17;

  const people = Number(affected_count) || 1;
  if (people > 1) score += Math.min((people - 1) * 3, 15);

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    priority_score: score,
    ai_category: bandFor(score),
    ai_summary: firstSentence(description),
    ai_source: "heuristic",
  };
}

// -------- Real Claude (Haiku) call via structured tool use ------------------
const TRIAGE_TOOL = {
  name: "record_triage",
  description: "Record the triage assessment for an incoming emergency assistance request.",
  input_schema: {
    type: "object",
    properties: {
      priority_score: { type: "integer", description: "Urgency from 0 to 100 (100 = life-threatening, act immediately)." },
      category: { type: "string", enum: ["critical", "urgent", "standard", "low"], description: "Urgency band." },
      summary: { type: "string", description: "ONE factual sentence summarising the need. No invented details." },
    },
    required: ["priority_score", "category", "summary"],
    additionalProperties: false,
  },
  strict: true,
};

const SYSTEM_RUBRIC =
  "You are the triage assistant for CrisisConnect, an emergency-response coordination tool for " +
  "British Columbia. Score each incoming citizen assistance request so an administrator can " +
  "prioritise a response queue.\n\n" +
  "Scoring rubric (priority_score):\n" +
  "- 85-100: life-threatening or medical emergency — trapped, not breathing, severe bleeding, " +
  "oxygen-dependent, cardiac/stroke, drowning.\n" +
  "- 60-84: urgent need affecting vulnerable people — evacuation, elderly/children/disabled at " +
  "risk, no water, exposure/hypothermia.\n" +
  "- 30-59: important but stable — food, water, shelter, transport for people not in immediate danger.\n" +
  "- 0-29: general, informational, or low-urgency requests.\n\n" +
  "category is the matching band: critical (>=85), urgent (60-84), standard (30-59), low (<30). " +
  "summary is ONE factual sentence with no invented details. Your assessment is only a SUGGESTION " +
  "to help an administrator, who always makes the final decision.";

let _client = null;
function getClient() {
  if (_client) return _client;
  const Anthropic = require("@anthropic-ai/sdk");
  _client = new Anthropic({ apiKey: API_KEY, maxRetries: 1, timeout: 15000 });
  return _client;
}

async function claudeTriage({ request_type, description, affected_count }) {
  const client = getClient();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: SYSTEM_RUBRIC,
    tools: [TRIAGE_TOOL],
    tool_choice: { type: "tool", name: "record_triage" },
    messages: [
      {
        role: "user",
        content:
          `Request type: ${request_type}\n` +
          `People affected: ${Number(affected_count) || 1}\n` +
          `Description: ${description}`,
      },
    ],
  });

  const block = (msg.content || []).find((b) => b.type === "tool_use");
  if (!block || !block.input) throw new Error("no tool_use block returned");
  const out = block.input;

  let score = Math.round(Number(out.priority_score));
  if (!Number.isFinite(score)) throw new Error("invalid priority_score");
  score = Math.max(0, Math.min(100, score));

  const allowed = ["critical", "urgent", "standard", "low"];
  const category = allowed.includes(out.category) ? out.category : bandFor(score);
  const summary = (out.summary && String(out.summary).trim()) || firstSentence(description);

  return {
    priority_score: score,
    ai_category: category,
    ai_summary: summary.slice(0, 280),
    ai_source: "claude",
  };
}

// -------- Public entry point ------------------------------------------------
// Tries Claude when configured, falls back to the heuristic on any problem.
async function triageRequest(input) {
  if (!AI_ENABLED || !API_KEY) return heuristicTriage(input);
  try {
    return await claudeTriage(input);
  } catch (err) {
    console.warn("[triage] Claude call failed, using heuristic fallback:", err.message);
    return heuristicTriage(input);
  }
}

module.exports = { triageRequest, heuristicTriage, bandFor };
