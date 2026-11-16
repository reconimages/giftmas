const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const form = document.getElementById('gift-form');
const input = document.getElementById('recipient');
const out = document.getElementById('recommendation-results');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sentence = (input.value || '').trim();
    if (!sentence) return;
    out.innerHTML = '<p class="loading">Finding the perfect gifts...</p>';
    try {
      const payload = { query: sentence, page: window.PAGE_SLUG };
      console.log('Sending to API:', payload);
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      render(data);
    } catch (err) {
      out.innerHTML = `<p class="error">AI engine unavailable (${esc(err.message)}). Try again in a moment.</p>`;
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
  const cards = (data.recommendations || []).map((r) => {
    const title = r.title || r.productType || r.product_type || '';
    const reason = r.reason || '';
    const term = r.searchTerm || title;
    const href = 'https://www.amazon.co.uk/s?k=' + encodeURIComponent(term) + '&tag=giftmas00-21';
    return `
      <article class="card">
        <h3>${esc(title)}</h3>
        <p class="reason">${esc(reason)}</p>
        <a class="buy" href="${esc(href)}" rel="sponsored nofollow noopener" target="_blank">Buy on Amazon</a>
      </article>`;
  }).join('');
  out.innerHTML = '<p class="parsed">' + esc(label) + chipsHtml + '</p>' + cards;
}
