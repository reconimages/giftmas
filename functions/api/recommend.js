// Cloudflare Pages Function: single server-side AI endpoint.
// No Amazon API of any kind. Key comes from a Pages environment variable.
export async function onRequestPost(context) {
  const { request, env } = context;
  let input;
  try { input = await request.json(); } catch { return json({ error: 'Body must be JSON with a "sentence" string.' }, 400); }
  const sentence = String(input?.sentence || input?.query || '').trim();
  let page = String(input?.page || '');
  if (!page) page = /girlfriend|skincare|beauty|\bher\b/i.test(sentence) ? 'gifts-for-girlfriend' : 'home';
  if (!PAGES[page]) page = 'home';
  if (!sentence || sentence.length > 300) return json({ error: 'Sentence is empty or over 300 characters.' }, 400);

  const modelKey = env.MODEL_API_KEY || env.OPENAI_API_KEY || '';
  const modelBase = (env.MODEL_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const modelName = env.MODEL_MODEL || 'gpt-4o-mini';

  try {
    if (modelKey) {
      const out = await aiRecommend(sentence, page, modelKey, modelBase, modelName);
      return json({ ...out, disclosure: 'As an Amazon Associate, I earn from qualifying purchases.' });
    }
    const out = parseLocal(sentence, page);
    return json({ ...out, source: 'local-fallback', disclosure: 'As an Amazon Associate, I earn from qualifying purchases.' });
  } catch (err) {
    const out = parseLocal(sentence, page);
    return json({ ...out, source: 'local-fallback', disclosure: 'As an Amazon Associate, I earn from qualifying purchases.' });
  }
}

const PAGES = {
  'home': 'General UK gift recommendations',
  'secret-santa': 'UK Secret Santa gifts, target budget £10–£15',
  'gifts-for-girlfriend': 'Gifts for girlfriend, lead sub-theme skincare/beauty',
};

const SYSTEM = 'You are an expert UK gift buyer. The user will provide a budget, a recipient, and their interests. You must recommend exactly 3 highly specific gift ideas. Do not recommend generic items like "a gift card" or "a mug". Each recommendation must have a specific search term that will yield the best results on Amazon UK. Return ONLY a valid JSON array with exactly this structure, no markdown, no backticks: [{"title": "String", "reason": "String (quote the user\'s interests)", "searchTerm": "String (3-5 words for Amazon search)"}]';

function parseLocal(sentence, page) {
  const lower = sentence.toLowerCase();
  const budgetMatch = sentence.match(/£\s*(\d+(?:\.\d{2})?)/)
    || sentence.match(/(\d+(?:\.\d{2})?)\s*(?:pounds|gbp|budget)/i)
    || sentence.match(/budget\D{0,6}(\d+(?:\.\d{2})?)/i);
  const budget = budgetMatch ? Number(budgetMatch[1]) : null;
  const recipientMatch = sentence.match(/\b(girlfriend|wife|partner|friend|mum|mother|dad|father|sister|brother|teenager|teen|him|her|them)\b/i);
  const interestWords = (lower.match(/skincare|beauty|makeup|perfume|candle|cosy|socks|knit|pyjamas|chocolate|tea|coffee|home|travel|reading|gardening|fitness|music|films?|crafts?|tech|gaming|dogs?|cats?|football|rugby|yoga|cooking/g) || []);
  const catalog = {
    'home': [
      ['Scented candle gift set', 'scented candle gift set'],
      ['Novelty sock gift set', 'novelty sock gift set'],
      ['Luxury skincare gift set', 'luxury skincare gift set'],
      ['Silk pyjama set', 'silk pyjama set women'],
      ['Fragrance gift set', 'fragrance gift set for her'],
    ],
    'secret-santa': [
      ['Scented candle gift set', 'scented candle gift set under 15'],
      ['Novelty sock gift set', 'funny secret santa socks'],
      ['Mini skincare discovery set', 'mini skincare discovery set'],
    ],
    'gifts-for-girlfriend': [
      ['Luxury skincare gift set', 'luxury skincare gift set for her'],
      ['Silk pyjama set', 'silk pyjamas women'],
      ['Fragrance gift set', 'perfume gift set for her'],
    ],
  };
  const recs = catalog[page].map(([title, searchTerm], i) => {
    const echo = interestWords[i % Math.max(1, interestWords.length)] || (recipientMatch ? recipientMatch[1] : 'your recipient');
    return {
      title,
      reason: `You mentioned ${echo}, so ${title.toLowerCase()} is a practical match that stays inside the budget.`,
      searchTerm,
    };
  }).slice(0, 3);
  return {
    conditions: { budget_gbp: budget, recipient: recipientMatch ? recipientMatch[1] : null, interests: interestWords.slice(0, 5) },
    recommendations: recs,
  };
}

function parseConditions(sentence) {
  const lower = sentence.toLowerCase();
  const budgetMatch = sentence.match(/£\s*(\d+(?:\.\d{2})?)/)
    || sentence.match(/(\d+(?:\.\d{2})?)\s*(?:pounds|gbp|budget)/i)
    || sentence.match(/budget\D{0,6}(\d+(?:\.\d{2})?)/i);
  const budget = budgetMatch ? Number(budgetMatch[1]) : null;
  const recipientMatch = sentence.match(/\b(girlfriend|wife|partner|friend|mum|mother|dad|father|sister|brother|teenager|teen|him|her|them)\b/i);
  const interestWords = (lower.match(/skincare|beauty|makeup|perfume|candle|cosy|socks|knit|pyjamas|chocolate|tea|coffee|home|travel|reading|gardening|fitness|music|films?|crafts?|tech|gaming|dogs?|cats?|football|rugby|yoga|cooking/g) || []);
  return { budget_gbp: budget, recipient: recipientMatch ? recipientMatch[1] : null, interests: interestWords.slice(0, 5) };
}

function sanitize(parsed, sentence) {
  const arr = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.recommendations) ? parsed.recommendations : null);
  if (!arr) throw new Error('bad shape');
  const words = sentence.toLowerCase().replace(/[^a-z0-9£\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  let recs = arr.filter(r => r && typeof r.title === 'string' && typeof r.reason === 'string' && typeof r.searchTerm === 'string');
  recs = recs.slice(0, 3);
  if (recs.length < 2) throw new Error('too few recommendations');
  for (const r of recs) {
    r.title = String(r.title).slice(0, 120);
    r.reason = String(r.reason).slice(0, 300);
    r.searchTerm = String(r.searchTerm).slice(0, 80);
  }
  const dump = JSON.stringify(recs);
  if (/B0[A-Z0-9]{8}/i.test(dump) || /ASIN/i.test(dump) || /★|\d\s?stars?/i.test(dump) || /gift card|video game|console/i.test(dump)) {
    throw new Error('model output violated product constraints');
  }
  const referenced = recs.every(r => words.some(w => r.reason.toLowerCase().includes(w)));
  if (!referenced) throw new Error('reasons do not reference the user words');
  return recs;
}

async function aiRecommend(sentence, page, modelKey, modelBase, modelName) {
  const body = JSON.stringify({
    model: modelName,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: sentence },
    ],
    max_tokens: 500,
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(`${modelBase}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${modelKey}` },
      body,
    });
    if (!res.ok) throw new Error(`model HTTP ${res.status}`);
    const data = await res.json();
    let text = data.choices?.[0]?.message?.content || '';
    text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    let parsed;
    const aStart = text.indexOf('[');
    const aEnd = text.lastIndexOf(']');
    const oStart = text.indexOf('{');
    const oEnd = text.lastIndexOf('}');
    if (aStart !== -1 && aEnd !== -1 && (oStart === -1 || aStart < oStart)) {
      parsed = JSON.parse(text.slice(aStart, aEnd + 1));
    } else if (oStart !== -1 && oEnd !== -1) {
      parsed = JSON.parse(text.slice(oStart, oEnd + 1));
    } else {
      throw new Error('no JSON in model reply');
    }
    const conditions = parseConditions(sentence);
    return { conditions, recommendations: sanitize(parsed, sentence), source: 'model' };
  } finally {
    clearTimeout(timer);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
