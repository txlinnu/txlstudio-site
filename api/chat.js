// POST /api/chat  ->  { reply, action, package?, suggestions, mode }
//
// Free by design:
//  1. Questions the rules in _lib/knowledge.js understand are answered from the verified facts. No AI, no limits, no cost.
//  2. Only questions the rules do NOT understand go to a free AI model on Groq (needs GROQ_API_KEY, free to create).
//     Without a key, or if Groq is rate-limited / down / slow, the visitor gets the safe hand-off to Inayath instead.
//  3. Anything the model says is checked before it is shown: invented prices, links and e-mail addresses are rejected.
import { SYSTEM_PROMPT, PACKAGE_IDS, ALLOWED_AMOUNTS, packageCard, basicReply } from './_lib/knowledge.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-20b';      // supports strict JSON-schema output; override with CHAT_MODEL
const ALLOWED_ORIGINS = new Set([
  'https://txlstudio.vercel.app',
  'http://localhost:5970', 'http://127.0.0.1:5970', 'http://localhost:3000', 'http://127.0.0.1:3000'
]);
const MAX_TURNS = 12;          // messages accepted per request
const AI_TURNS = 6;            // messages forwarded to the model (keeps free-tier token use small)
const MAX_CHARS = 600;         // per visitor message
const MAX_BODY = 12000;        // bytes
const AI_TIMEOUT_MS = 12_000;
const PER_MINUTE = 10;         // requests per IP per minute (best effort: per warm serverless instance)
const PER_DAY = 80;            // requests per IP per day   (same caveat)

const ACTIONS = ['none', 'recommend', 'contact'];
// Strict JSON schema: every property required, no extras, no nullable unions ("none" instead of null).
const SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    action: { type: 'string', enum: ACTIONS },
    package_id: { type: 'string', enum: [...PACKAGE_IDS, 'none'] },
    suggestions: { type: 'array', items: { type: 'string' } }
  },
  required: ['reply', 'action', 'package_id', 'suggestions'],
  additionalProperties: false
};

const hits = new Map(); // ip -> { m: [timestamps], d: [timestamps] }
function limited(ip, now = Date.now()) {
  const h = hits.get(ip) || { m: [], d: [] };
  h.m = h.m.filter((t) => now - t < 60_000);
  h.d = h.d.filter((t) => now - t < 86_400_000);
  const over = h.m.length >= PER_MINUTE || h.d.length >= PER_DAY;
  if (!over) { h.m.push(now); h.d.push(now); }
  hits.set(ip, h);
  if (hits.size > 5000) for (const [k, v] of hits) { if (!v.d.length || now - v.d[v.d.length - 1] > 86_400_000) hits.delete(k); }
  return over;
}

function clean(s) {
  return String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
}

// Validates the visitor-supplied history: alternating roles, text only, ends with a user message.
export function parseMessages(body) {
  const raw = body && Array.isArray(body.messages) ? body.messages : null;
  if (!raw || !raw.length) return null;
  const out = [];
  for (const m of raw.slice(-MAX_TURNS)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return null;
    const content = clean(m.content);
    if (!content) return null;
    out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  for (let i = 1; i < out.length; i++) if (out[i].role === out[i - 1].role) return null;
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}

// A free model is less careful than a frontier one, so its text is checked before the visitor sees it.
export function replyIsSafe(text) {
  if (typeof text !== 'string' || text.trim().length < 2 || text.length > 1200) return false;
  if (/https?:|www\.|\.com\b|\.in\b|@/i.test(text)) return false;            // no links or e-mail addresses
  if (/\+?\d[\d\s-]{8,}\d/.test(text)) return false;                          // no phone numbers
  for (const m of text.matchAll(/\d[\d,]{3,}/g)) {                            // any 4+ digit amount must be a real price
    const n = Number(m[0].replace(/,/g, ''));
    if (!ALLOWED_AMOUNTS.has(n)) return false;
  }
  return true;
}

function validateModelOutput(o) {
  if (!o || typeof o !== 'object') return null;
  if (!ACTIONS.includes(o.action)) return null;
  const pid = PACKAGE_IDS.includes(o.package_id) ? o.package_id : null;
  if (o.action === 'recommend' && !pid) return null;
  if (!replyIsSafe(o.reply)) return null;
  const sugg = Array.isArray(o.suggestions) ? o.suggestions.filter((x) => typeof x === 'string') : [];
  return { reply: o.reply, action: o.action, package_id: o.action === 'recommend' ? pid : null, suggestions: sugg };
}

function shape(r, mode) {
  const card = r.action === 'recommend' && r.package_id ? packageCard(r.package_id) : null;
  return {
    reply: clean(r.reply).slice(0, 900),
    action: r.action === 'recommend' && !card ? 'none' : r.action,
    package: card,
    suggestions: (r.suggestions || []).map((s) => clean(s).slice(0, 40)).filter(Boolean).slice(0, 3),
    mode
  };
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;         // Vercel parses JSON for us
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > MAX_BODY) throw new Error('too large'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

async function askModel({ fetchImpl, apiKey, model, messages }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const r = await fetchImpl(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.slice(-AI_TURNS)],
        response_format: { type: 'json_schema', json_schema: { name: 'assistant_reply', strict: true, schema: SCHEMA } },
        reasoning_effort: 'low',
        include_reasoning: false,
        max_completion_tokens: 900,
        temperature: 0.3
      })
    });
    if (!r.ok) { console.error('groq status', r.status); return null; }   // 429 / 5xx / 400: fall back quietly
    const data = await r.json();
    const choice = data && data.choices && data.choices[0];
    if (!choice || choice.finish_reason === 'length' || !choice.message || typeof choice.message.content !== 'string') return null;
    return validateModelOutput(JSON.parse(choice.message.content));
  } catch (err) {
    console.error('groq error', err && err.name);                          // timeout, network, bad JSON
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function createHandler({ fetchImpl = globalThis.fetch, apiKey = process.env.GROQ_API_KEY, model = process.env.CHAT_MODEL || DEFAULT_MODEL } = {}) {
  return async function handler(req, res) {
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.statusCode = 204; return res.end();
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
    if (!ALLOWED_ORIGINS.has(origin)) return send(res, 403, { error: 'Not allowed' });

    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (limited(ip)) return send(res, 429, { error: 'rate_limited' });

    let messages;
    try { messages = parseMessages(await readJson(req)); } catch { messages = null; }
    if (!messages) return send(res, 400, { error: 'Bad request' });

    const basic = basicReply(messages);
    // Free path: the rules understood the question (or there is no key): answer from the verified facts.
    if (basic.matched || !apiKey) return send(res, 200, shape(basic, 'basic'));

    // Unusual question: let the free model try, else fall back to the hand-off the rules already prepared.
    const ai = await askModel({ fetchImpl, apiKey, model, messages });
    return send(res, 200, ai ? shape(ai, 'ai') : shape(basic, 'basic'));
  };
}

export default createHandler();
