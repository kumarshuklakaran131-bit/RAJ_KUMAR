// Cloudflare Pages Function: site ke saath same domain par chalta hai (koi CORS nahi).
// Routes:
//   POST /api/supplier      -> SUPPLIER_URL (secret/variable) par forward
//   GET  /api/gw/...        -> GATEWAY_URL/... par forward
//   POST /api/event         -> Telegram admin ko message (TELEGRAM_BOT_TOKEN kabhi browser ko nahi jata)
//   GET  /api/health        -> status
// Environment variables (Pages → Settings → Variables and Secrets):
//   SUPPLIER_URL, GATEWAY_URL, TELEGRAM_BOT_TOKEN (Secret), ADMIN_CHAT_ID

const EVENT_LABELS = {
  login: 'Login',
  key_purchase: 'Key purchase',
  balance_add: 'Balance add (auto payment)',
  reseller_request: 'Reseller/Premium request',
};
const MAX_BODY = 64 * 1024;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

async function readLimited(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) throw new Error('body too large');
  return text;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const parts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const route = parts.join('/');
  const url = new URL(request.url);

  try {
    if (route === 'health') return json({ status: 'ok' });

    if (route === 'supplier' && request.method === 'POST') {
      if (!env.SUPPLIER_URL) return json({ status: 'error', message: 'SUPPLIER_URL set nahi hai' }, 500);
      const body = await readLimited(request);
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      const mk = request.headers.get('x-master-key');
      if (mk) headers['x-master-key'] = mk;
      const r = await fetch(env.SUPPLIER_URL, { method: 'POST', headers, body });
      return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': r.headers.get('content-type') || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    if (parts[0] === 'gw' && request.method === 'GET') {
      if (!env.GATEWAY_URL) return json({ status: 'error', message: 'GATEWAY_URL set nahi hai' }, 500);
      const rest = parts.slice(1).join('/');
      const target = env.GATEWAY_URL.replace(/\/+$/, '') + '/' + rest + url.search;
      const r = await fetch(target, { cache: 'no-store' });
      return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': r.headers.get('content-type') || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    if (route === 'event' && request.method === 'POST') {
      // Sirf isi site se events (Origin check). Pakka suraksha nahi, par spam kam karta hai.
      const origin = request.headers.get('Origin');
      if (origin && new URL(origin).host !== url.host) return json({ message: 'forbidden' }, 403);
      const ev = await request.json().catch(() => null);
      if (!ev || !EVENT_LABELS[ev.type]) return json({ message: 'bad event' }, 400);
      if (!env.TELEGRAM_BOT_TOKEN || !env.ADMIN_CHAT_ID) return json({ status: 'error', message: 'Telegram variables set nahi hain' }, 500);
      const when = new Date(Number(ev.at) || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const extra = ev.data && Object.keys(ev.data).length ? '\n' + JSON.stringify(ev.data).slice(0, 500) : '';
      const text = `🔔 ${EVENT_LABELS[ev.type]}\nUser ID: ${String(ev.uid || 'guest').slice(0, 80)}\nTime: ${when}${extra}`;
      const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: env.ADMIN_CHAT_ID, text }),
      });
      if (!r.ok) return json({ status: 'error', message: 'Telegram error ' + r.status }, 502);
      return json({ status: 'ok' });
    }

    return json({ message: 'Route nahi mila' }, 404);
  } catch (e) {
    return json({ status: 'error', message: 'Server error: ' + e.message }, 502);
  }
}
