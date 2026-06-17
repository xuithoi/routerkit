import './style.css';
import { connectProvider, checkRedirectCallback } from './oauth.js';
import {
  renderSidebar, renderTopbar,
  renderOverview, renderAccounts, renderQuota,
  renderLogs, renderBilling, renderTeam, renderSettings,
  renderAddModal,
} from './views.js';
import { state } from './state.js';

// ── Chart.js lazy load ─────────────────────────────────────────
let Chart = null;
async function loadChart() {
  if (Chart) return Chart;
  const m = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js');
  Chart = window.Chart;
  return Chart;
}

// ── Layout ─────────────────────────────────────────────────────
const app = document.getElementById('app');

app.innerHTML = `
  <aside class="rk-sidebar" id="sidebar"></aside>
  <div class="rk-main">
    <header class="rk-topbar" id="topbar"></header>
    <div class="rk-content" id="content"></div>
  </div>
  ${renderAddModal()}
`;

// ── Render Orchestrator ────────────────────────────────────────
async function render() {
  // Sidebar & topbar always re-render (active state)
  document.getElementById('sidebar').innerHTML = renderSidebar();
  document.getElementById('topbar').innerHTML  = renderTopbar();

  const content = document.getElementById('content');

  switch (state.view) {
    case 'overview':
      content.innerHTML = renderOverview();
      await mountOverviewCharts();
      break;
    case 'accounts':
      content.innerHTML = renderAccounts();
      break;
    case 'quota':
      content.innerHTML = renderQuota();
      break;
    case 'logs':
      content.innerHTML = renderLogs();
      break;
    case 'billing':
      content.innerHTML = renderBilling();
      break;
    case 'team':
      content.innerHTML = renderTeam();
      break;
    case 'settings':
      content.innerHTML = renderSettings();
      break;
    default:
      content.innerHTML = renderOverview();
      await mountOverviewCharts();
  }

  bindEvents();
}

// ── Chart mounting ─────────────────────────────────────────────
async function mountOverviewCharts() {
  await loadChart();
  if (!window.Chart) return;

  window.Chart.defaults.color = 'hsl(215,15%,55%)';
  window.Chart.defaults.borderColor = 'rgba(148,163,184,.08)';
  window.Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";

  // Volume line chart
  const ctxVol = document.getElementById('chart-volume');
  if (ctxVol) {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const data = [142, 198, 175, 312, 284, 201, 231];
    new window.Chart(ctxVol, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Requests',
          data,
          backgroundColor: 'rgba(124,58,237,.2)',
          borderColor: '#7c3aed',
          borderRadius: 6,
          borderWidth: 1,
          hoverBackgroundColor: 'rgba(124,58,237,.35)',
        }, {
          label: 'Trend',
          data,
          type: 'line',
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          tension: 0.45,
          pointRadius: 3,
          pointBackgroundColor: '#3b82f6',
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(148,163,184,.06)' }, beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  // Share doughnut
  const ctxShare = document.getElementById('chart-share');
  if (ctxShare) {
    new window.Chart(ctxShare, {
      type: 'doughnut',
      data: {
        labels: ['Claude','Codex','Gemini','Kiro','GitHub'],
        datasets: [{
          data: [341, 512, 219, 178, 94],
          backgroundColor: ['#f59e0b','#22c55e','#3b82f6','#14b8a6','#94a3b8'],
          borderWidth: 0,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } } }
        }
      }
    });
  }
}

// ── Event Binding ──────────────────────────────────────────────
function bindEvents() {
  // Nav items
  document.querySelectorAll('.rk-nav-item[data-view]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.view));
  });

  // View-all buttons in tables
  document.querySelectorAll('[data-view]').forEach(el => {
    if (el.tagName === 'BUTTON' || el.tagName === 'A') {
      el.addEventListener('click', (e) => { e.preventDefault(); navigate(el.dataset.view); });
    }
  });

  // Topbar refresh
  document.getElementById('btn-topbar-refresh')?.addEventListener('click', () => render());

  // Add account
  document.getElementById('btn-add-account')?.addEventListener('click', openAddModal);

  // Invite
  document.getElementById('btn-invite')?.addEventListener('click', () => {
    alert('Invite flow — connect to your backend here.');
  });

  // Export logs
  document.getElementById('btn-export-logs')?.addEventListener('click', exportLogs);

  // Save settings
  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-save-settings');
    btn.textContent = '✅ Saved';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = 'Save Settings'; btn.disabled = false; }, 2000);
  });

  // Action buttons (refresh token, remove)
  document.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const { action, id } = el.dataset;
      if (action === 'remove-account') removeAccount(id);
      if (action === 'refresh-token')  refreshToken(id);
      if (action === 'remove-member')  removeMember(id);
    });
  });

  // Log filter
  document.getElementById('filter-provider')?.addEventListener('change', e => {
    const v = e.target.value;
    const filtered = v ? state.logs.filter(l => l.provider === v) : state.logs;
    const body = document.getElementById('logs-body');
    if (body) body.innerHTML = filtered.length
      ? `<table class="rk-table">
          <thead><tr><th>Time</th><th>Provider</th><th>Model</th><th>Tok In</th><th>Tok Out</th><th>RTK Saved</th><th>Latency</th><th>Status</th></tr></thead>
          <tbody>${filtered.map(l => {
            const sc = l.status >= 200 && l.status < 300 ? 'text-green' : 'text-red';
            const { PROVIDERS: P, fmt } = window.__rk__;
            const p = P[l.provider] || { emoji:'?', label:l.provider, cls:'' };
            return `<tr>
              <td class="mono text-muted">${l.ts}</td>
              <td><span class="prov-pill"><span class="prov-dot pd-${p.cls}">${p.emoji}</span>${p.label}</span></td>
              <td><span class="tag">${l.model}</span></td>
              <td class="mono">${fmt(l.tokIn)}</td>
              <td class="mono">${fmt(l.tokOut)}</td>
              <td class="mono text-green">${l.saved > 0 ? '+'+fmt(l.saved) : '—'}</td>
              <td class="mono">${l.ms}ms</td>
              <td class="mono ${sc}">${l.status}</td>
            </tr>`;
          }).join('')}</tbody></table>`
      : `<div class="empty"><div class="empty-icon">📭</div><h3>No results</h3></div>`;
  });

  // Modal
  document.getElementById('btn-modal-close')?.addEventListener('click', closeAddModal);
  document.getElementById('modal-add')?.addEventListener('click', closeAddModal);

  document.querySelectorAll('.prov-card[data-provider]').forEach(el => {
    el.addEventListener('click', () => startOAuth(el.dataset.provider));
  });
}

// ── Navigation ─────────────────────────────────────────────────
function navigate(view) {
  state.view = view;
  render();
}

// ── Modal ──────────────────────────────────────────────────────
function openAddModal() {
  document.getElementById('modal-add')?.classList.remove('hidden');
  document.getElementById('prov-grid')?.classList.remove('hidden');
  document.getElementById('oauth-flow')?.classList.add('hidden');
}
function closeAddModal() {
  document.getElementById('modal-add')?.classList.add('hidden');
}

async function startOAuth(provider) {
  // Hide grid, show back button
  const grid     = document.getElementById('prov-grid');
  const flowEl   = document.getElementById('oauth-flow');
  const deviceEl = document.getElementById('oauth-device');
  const deferEl  = document.getElementById('oauth-deferred');
  const backBtn  = document.getElementById('btn-back-providers');
  const titleEl  = document.getElementById('oauth-status-title');
  const subEl    = document.getElementById('oauth-status-sub');

  function showPanel(which) {
    grid?.classList.add('hidden');
    flowEl?.classList.add('hidden');
    deviceEl?.classList.add('hidden');
    deferEl?.classList.add('hidden');
    backBtn?.classList.remove('hidden');
    document.getElementById(which)?.classList.remove('hidden');
  }

  try {
    const result = await connectProvider(provider, (phase, title, detail) => {
      if (phase === 'browser' || phase === 'exchange') {
        showPanel('oauth-flow');
        if (titleEl) titleEl.textContent = title;
        if (subEl) {
          if (phase === 'browser') {
            subEl.textContent = '🔐 A login window opened — complete sign-in there, then return here.';
          } else {
            subEl.textContent = 'Exchanging token… almost done.';
          }
        }
      }

      if (phase === 'device_code') {
        showPanel('oauth-device');
        const codeEl   = document.getElementById('device-code');
        const urlEl    = document.getElementById('device-url');
        const statusEl = document.getElementById('device-status');
        if (codeEl) codeEl.textContent = detail.user_code || '';
        if (urlEl)  { urlEl.href = detail.verification_uri; urlEl.textContent = detail.verification_uri + ' ↗'; }
        if (statusEl) statusEl.textContent = 'Waiting for you to enter the code and approve…';
      }

      if (phase === 'device_manual') {
        showPanel('oauth-deferred');
        document.getElementById('deferred-title').textContent = title;
        document.getElementById('deferred-note').textContent  = detail.note || '';
      }

      if (phase === 'portal') {
        showPanel('oauth-deferred');
        document.getElementById('deferred-title').textContent = title;
        document.getElementById('deferred-note').textContent  = typeof detail === 'string' ? detail : '';
      }

      if (phase === 'done') {
        const { provider: prov, email, tokens } = detail || {};
        // Save to app state
        const { PROVIDERS: P } = window.__rk__ || {};
        state.accounts.push({
          id:          'acc-' + Date.now(),
          provider:    prov,
          name:        email || `${prov}-account`,
          plan:        'Connected',
          status:      'active',
          tokensUsed:  0,
          tokensLimit: 100000,
          requests:    0,
          cost:        0,
          addedAt:     new Date().toISOString().slice(0,10),
          tokens,
        });
      }

      if (phase === 'error') {
        showPanel('oauth-flow');
        if (titleEl) titleEl.textContent = '❌ ' + title;
        if (subEl)   subEl.textContent   = typeof detail === 'string' ? detail : 'Authentication failed';
        document.getElementById('oauth-spinner')?.classList.add('hidden');
      }
    });

    if (result?.deferred) {
      // Already shown deferred panel
      return;
    }

    if (result) {
      // Success!
      showPanel('oauth-flow');
      if (titleEl) titleEl.textContent = '✅ Connected!';
      if (subEl)   subEl.textContent   = `${provider} account authenticated successfully.`;
      document.getElementById('oauth-spinner')?.classList.add('hidden');
      await new Promise(r => setTimeout(r, 1500));
      closeAddModal();
      navigate('accounts');
    }
  } catch (err) {
    showPanel('oauth-flow');
    if (titleEl) titleEl.textContent = '❌ Failed';
    if (subEl)   subEl.textContent   = err.message;
    document.getElementById('oauth-spinner')?.classList.add('hidden');
  }
}

// ── Account Actions ────────────────────────────────────────────
function removeAccount(id) {
  if (!confirm('Remove this account?')) return;
  state.accounts = state.accounts.filter(a => a.id !== id);
  render();
}

function refreshToken(id) {
  const acc = state.accounts.find(a => a.id === id);
  if (!acc) return;
  const btn = document.querySelector(`[data-action="refresh-token"][data-id="${id}"]`);
  if (btn) { btn.innerHTML = '<div class="spinner" style="width:13px;height:13px"></div>'; btn.disabled = true; }
  setTimeout(() => {
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`; }
    showToast(`Token refreshed for ${acc.name}`);
  }, 1400);
}

function removeMember(id) {
  if (!confirm('Remove this member?')) return;
  state.members = state.members.filter(m => m.id !== id);
  render();
}

// ── Export ─────────────────────────────────────────────────────
function exportLogs() {
  const csv = ['Time,Provider,Model,Tokens In,Tokens Out,RTK Saved,Latency,Status',
    ...state.logs.map(l => `${l.ts},${l.provider},${l.model},${l.tokIn},${l.tokOut},${l.saved},${l.ms}ms,${l.status}`)
  ].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'routerkit-logs.csv';
  a.click();
}

// ── Toast ──────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:var(--s3);border:1px solid var(--b2);color:var(--t1);padding:12px 20px;border-radius:10px;font-size:13.5px;font-weight:500;z-index:999;box-shadow:0 8px 30px rgba(0,0,0,.4);animation:fade-up .2s ease`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Expose helpers for inline filter handler
window.__rk__ = await import('./state.js');

// ── Handle Redirect Callback (popup blocked → full redirect) ───────
const pending = checkRedirectCallback();
if (pending?.code) {
  showToast(`✅ Authentication code received — completing sign-in…`);
}

// ── Boot ─────────────────────────────────────────────
render();
