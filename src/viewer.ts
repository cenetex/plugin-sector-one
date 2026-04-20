const VIEWER_FRAME_ANCESTORS_DIRECTIVE =
  "frame-ancestors 'self' http://localhost:* http://127.0.0.1:* " +
  "http://[::1]:* http://[0:0:0:0:0:0:0:1]:* https://localhost:* " +
  "https://127.0.0.1:* https://[::1]:* https://[0:0:0:0:0:0:0:1]:* " +
  "electrobun: capacitor: capacitor-electron: app: tauri: file:";

export { VIEWER_FRAME_ANCESTORS_DIRECTIVE };

export interface ViewerRenderOptions {
  agentName: string;
  sessionId: string;
  apiBase: string;
  role: "agent" | "human";
}

export function renderViewerHtml(opts: ViewerRenderOptions): string {
  const safeAgent = escapeHtml(opts.agentName);
  const safeSession = encodeURIComponent(opts.sessionId);
  const safeApiBase = encodeURIComponent(opts.apiBase);
  const role = opts.role === "agent" ? "agent" : "human";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Signal: Sector One — ${safeAgent}</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #05070d;
    --panel: rgba(10, 18, 32, 0.85);
    --panel-border: rgba(0, 229, 255, 0.22);
    --accent: #7fe6ff;
    --accent-dim: rgba(127, 230, 255, 0.55);
    --text: #d6f4ff;
    --muted: rgba(214, 244, 255, 0.6);
    --warn: #ffb86b;
    --ok: #8ef0c0;
    --err: #ff8fa3;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: radial-gradient(ellipse at 30% 0%, #0a1a30 0%, #05070d 60%) fixed;
    color: var(--text);
    font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
    min-height: 100vh;
  }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--panel-border);
    background: linear-gradient(180deg, rgba(0, 229, 255, 0.05), transparent);
  }
  header .brand {
    font-weight: 600;
    font-size: 14px;
    color: var(--accent);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  header .agent {
    color: var(--muted);
    font-size: 12px;
  }
  header .role-pill {
    margin-left: auto;
    padding: 3px 10px;
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    font-size: 11px;
    color: var(--accent);
    background: rgba(0, 229, 255, 0.06);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 16px;
  }
  @media (max-width: 720px) {
    main { grid-template-columns: 1fr; }
  }
  .panel {
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 14px;
    padding: 14px 16px;
    min-height: 120px;
  }
  .panel h2 {
    margin: 0 0 10px;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .kv { display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; font-size: 12px; }
  .kv dt { color: var(--muted); }
  .kv dd { margin: 0; color: var(--text); font-variant-numeric: tabular-nums; }
  ul.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  ul.list li {
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(0, 229, 255, 0.04);
    border: 1px solid rgba(0, 229, 255, 0.08);
    font-size: 12px;
  }
  .muted { color: var(--muted); }
  .err { color: var(--err); }
  .ok { color: var(--ok); }
  .warn { color: var(--warn); }
  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .status-badge.running { background: rgba(142, 240, 192, 0.1); color: var(--ok); border: 1px solid rgba(142, 240, 192, 0.3); }
  .status-badge.connecting { background: rgba(255, 184, 107, 0.1); color: var(--warn); border: 1px solid rgba(255, 184, 107, 0.3); }
  .status-badge.degraded,
  .status-badge.unbound,
  .status-badge.error { background: rgba(255, 143, 163, 0.1); color: var(--err); border: 1px solid rgba(255, 143, 163, 0.3); }
  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }
  .suggestions button {
    border: 1px solid var(--panel-border);
    background: rgba(0, 229, 255, 0.06);
    color: var(--accent);
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 11px;
    cursor: pointer;
  }
  .suggestions button:hover { background: rgba(0, 229, 255, 0.12); }
  .suggestions button:disabled { cursor: not-allowed; opacity: 0.5; }
  footer {
    padding: 12px 16px;
    color: var(--muted);
    font-size: 11px;
    border-top: 1px solid var(--panel-border);
    display: flex;
    justify-content: space-between;
  }
  .err-banner {
    margin: 0 16px;
    padding: 10px 14px;
    border-radius: 10px;
    background: rgba(255, 143, 163, 0.08);
    border: 1px solid rgba(255, 143, 163, 0.3);
    color: var(--err);
    font-size: 12px;
  }
</style>
</head>
<body>
<header>
  <span class="brand">Sector One</span>
  <span class="agent">· ${safeAgent}</span>
  <span class="role-pill" id="role-pill">${role === "agent" ? "Agent" : "Spectate"}</span>
</header>
<div id="err-banner" class="err-banner" hidden></div>
<main>
  <section class="panel">
    <h2>Station</h2>
    <dl class="kv" id="station-kv"><dt class="muted">Status</dt><dd><span class="status-badge connecting">Connecting</span></dd></dl>
  </section>
  <section class="panel">
    <h2>Inventory &amp; Prices</h2>
    <ul class="list" id="prices-list"><li class="muted">Waiting for station data...</li></ul>
  </section>
  <section class="panel">
    <h2>Docked Pilots</h2>
    <ul class="list" id="pilots-list"><li class="muted">No pilots docked.</li></ul>
  </section>
  <section class="panel">
    <h2>${role === "agent" ? "Suggestions" : "Steer"}</h2>
    <div id="summary" class="muted" style="margin-bottom:10px"></div>
    <div class="suggestions" id="suggestions"></div>
  </section>
</main>
<footer>
  <span>session <code id="session-id">${escapeHtml(opts.sessionId)}</code></span>
  <span id="last-updated" class="muted">—</span>
</footer>
<script type="module">
  const SESSION_ID = decodeURIComponent("${safeSession}");
  const API_BASE = decodeURIComponent("${safeApiBase}");
  const ROLE = ${JSON.stringify(role)};
  const AGENT_NAME = ${JSON.stringify(opts.agentName)};

  const el = (id) => document.getElementById(id);
  const banner = el("err-banner");
  const summary = el("summary");
  const stationKv = el("station-kv");
  const pricesList = el("prices-list");
  const pilotsList = el("pilots-list");
  const suggestions = el("suggestions");
  const lastUpdated = el("last-updated");

  function showError(msg) {
    banner.textContent = msg;
    banner.hidden = false;
  }
  function clearError() {
    banner.hidden = true;
  }

  function statusBadge(status) {
    const cls = ["running", "connecting", "degraded", "unbound", "error"].includes(status)
      ? status
      : "connecting";
    return '<span class="status-badge ' + cls + '">' + status + '</span>';
  }

  function renderKv(session, telemetry) {
    const parts = [
      ['Status', statusBadge(session.status || 'unknown')],
      ['Mode', session.mode || '—'],
    ];
    if (session.goalLabel) parts.push(['Goal', session.goalLabel]);
    if (telemetry?.slot !== undefined && telemetry?.slot !== null) parts.push(['Slot', String(telemetry.slot)]);
    if (telemetry?.archetype) parts.push(['Archetype', telemetry.archetype]);
    if (telemetry?.hull !== undefined && telemetry?.hull_max !== undefined) {
      parts.push(['Hull', telemetry.hull + ' / ' + telemetry.hull_max]);
    }
    if (telemetry?.credits !== undefined) parts.push(['Credits', telemetry.credits.toLocaleString()]);
    if (telemetry?.owner_label) parts.push(['Owner', telemetry.owner_label]);
    stationKv.innerHTML = parts.map(([k, v]) => '<dt class="muted">' + k + '</dt><dd>' + v + '</dd>').join('');
  }

  function renderPrices(telemetry) {
    const prices = Array.isArray(telemetry?.prices) ? telemetry.prices : [];
    const inventory = Array.isArray(telemetry?.inventory) ? telemetry.inventory : [];
    const invByCommodity = Object.fromEntries(inventory.map((i) => [i.commodity, i.quantity]));
    if (prices.length === 0) {
      pricesList.innerHTML = '<li class="muted">No prices set.</li>';
      return;
    }
    pricesList.innerHTML = prices.map((p) => {
      const qty = invByCommodity[p.commodity] ?? 0;
      return '<li><strong>' + p.commodity + '</strong> · buy ' + p.buy + ' / sell ' + p.sell + ' · <span class="muted">stock ' + qty + '</span></li>';
    }).join('');
  }

  function renderPilots(telemetry) {
    const pilots = Array.isArray(telemetry?.docked_pilots) ? telemetry.docked_pilots : [];
    if (pilots.length === 0) {
      pilotsList.innerHTML = '<li class="muted">No pilots docked.</li>';
      return;
    }
    pilotsList.innerHTML = pilots.map((pilot) => {
      const cargo = Array.isArray(pilot.cargo)
        ? pilot.cargo.map((c) => c.commodity + ' ×' + c.quantity).join(', ')
        : '';
      return '<li><strong>' + pilot.handle + '</strong> <span class="muted">' + pilot.ship_class + '</span>' +
        (cargo ? ' · <span class="muted">' + cargo + '</span>' : '') + '</li>';
    }).join('');
  }

  function renderSuggestions(session) {
    const prompts = Array.isArray(session.suggestedPrompts) ? session.suggestedPrompts : [];
    const canSend = Boolean(session.canSendCommands);
    if (prompts.length === 0) {
      suggestions.innerHTML = '<span class="muted">No suggestions yet.</span>';
      return;
    }
    suggestions.innerHTML = prompts
      .map((prompt, idx) => '<button data-prompt-idx="' + idx + '"' + (canSend ? '' : ' disabled title="Read-only — agent is in control."') + '>' + escapeHtmlClient(prompt) + '</button>')
      .join('');
    suggestions.querySelectorAll('button[data-prompt-idx]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.promptIdx);
        const prompt = prompts[idx];
        await sendCommand({ type: 'suggestion', prompt, role: ROLE });
      });
    });
  }

  function escapeHtmlClient(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  async function pollSession() {
    try {
      const res = await fetch(API_BASE + '/session/' + encodeURIComponent(SESSION_ID), {
        headers: { accept: 'application/json' },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        showError('Session poll failed: ' + text);
        return;
      }
      clearError();
      const session = await res.json();
      const telemetry = session?.telemetry ?? {};
      summary.textContent = session?.summary ?? '';
      renderKv(session, telemetry);
      renderPrices(telemetry);
      renderPilots(telemetry);
      renderSuggestions(session);
      lastUpdated.textContent = 'updated ' + new Date().toLocaleTimeString();
    } catch (err) {
      showError(err && err.message ? err.message : String(err));
    }
  }

  async function sendCommand(payload) {
    try {
      const res = await fetch(API_BASE + '/session/' + encodeURIComponent(SESSION_ID) + '/command', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        showError(body?.message || ('Command failed (' + res.status + ')'));
      } else {
        clearError();
      }
      if (body?.session) {
        const session = body.session;
        const telemetry = session?.telemetry ?? {};
        summary.textContent = session?.summary ?? '';
        renderKv(session, telemetry);
        renderPrices(telemetry);
        renderPilots(telemetry);
        renderSuggestions(session);
      }
    } catch (err) {
      showError(err && err.message ? err.message : String(err));
    }
  }

  pollSession();
  setInterval(pollSession, 5000);
</script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return c;
    }
  });
}
