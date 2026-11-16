const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const form = document.getElementById('gift-form');
const input = document.getElementById('recipient');
const out = document.getElementById('results');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sentence = (input.value || '').trim();
    if (!sentence) return;
    out.innerHTML = '<p class="loading">Finding 2–3 picks that match…</p>';
    try {
      const res = await fetch('/api/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sentence, page: window.PAGE_SLUG }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      render(data);
    } catch (err) {
      out.innerHTML = `<p class="error">AI engine unavailable (${esc(err.message)}). Set MODEL_API_KEY on the server, or use the editor picks above.</p>`;
    }
  });
}
function render(data) {
  const c = data.conditions || {};
  const chips = [];
  if (c.budget_gbp) chips.push('Budget £' + c.budget_gbp);
  if (c.recipient) chips.push(c.recipient);
  (c.interests || []).forEach((i) => chips.push(i));
  const chipsHtml = chips.length ? '<ul class="chips">' + chips.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '';
  const label = data.source === 'model' ? 'Parsed from your sentence:' : 'Local picks (AI key not set):';
  out.innerHTML = '<p class="parsed">' + esc(label) + chipsHtml + '</p>' +
    (data.recommendations || []).map((r) => `
      <article class="card">
        <h3>${esc(r.product_type)}</h3>
        <p class="reason">${esc(r.reason)}</p>
        <p class="band">${esc(r.price_band)} · ${esc(r.commission_category)}</p>
        <a class="buy" href="${esc(r.link)}" rel="sponsored nofollow noopener" target="_blank">View on Amazon — editor: paste real ?tag=giftmas00-21 link here</a>
      </article>`).join('');
}
