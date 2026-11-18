document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('go');
  const itemsEl = document.getElementById('items');
  const locEl = document.getElementById('location');
  const userEl = document.getElementById('userId');
  const results = document.getElementById('results');

  btn.addEventListener('click', async () => {
    const raw = itemsEl.value.trim();
    if (!raw) return alert('Please add items');
    const items = raw.split(/\r?\n/).map(s => ({ name: s.trim() }));
    const payload = { items, location: locEl.value.trim() || undefined, userId: userEl.value.trim() || undefined };
    results.innerHTML = '<em>Fetching recommendations...</em>';
    try {
      const r = await fetch('/api/recycle/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!j.ok) { results.innerHTML = `<div class="error">Error: ${j.error || 'unknown'}</div>`; return }
      const list = j.recommendations || [];
      results.innerHTML = '';
      for (let i = 0; i < list.length; i++) {
        const li = list[i];
        const el = document.createElement('div');
        el.innerHTML = `<strong>${li.action}</strong> — ${li.reason} <span style="opacity:.7">(confidence ${Math.round((li.confidence||0)*100)}%)</span>`;
        const fbYes = document.createElement('button'); fbYes.textContent = '👍 Good'; fbYes.style.marginLeft='8px';
        fbYes.onclick = async () => { await fetch('/api/recycle/feedback', {method:'POST',headers:{'Content-Type':'application/json'}, body: JSON.stringify({userId:payload.userId,item:items[i],action:li.action,rating:5})}); alert('Thanks for the feedback!') }
        el.appendChild(fbYes);
        results.appendChild(el);
      }
    } catch (err) {
      results.innerHTML = `<div class="error">${err.message}</div>`;
    }
  });
});
