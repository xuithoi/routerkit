/**
 * RouterKit Dashboard — app.js
 * Frontend: tab routing, stats, charts, connections, logs, settings, OAuth flow.
 */

const BASE = '';  // same origin

// ─────────────────────────────────────────────
// Provider Icons & Colors
// ─────────────────────────────────────────────
const PROVIDERS = {
  claude:  { emoji: '✦', label: 'Claude',        color: '#e8a87c' },
  codex:   { emoji: '⬡', label: 'Codex/ChatGPT', color: '#10b981' },
  gemini:  { emoji: '✦', label: 'Gemini',         color: '#3b82f6' },
  kiro:    { emoji: '⬡', label: 'Kiro AI',        color: '#22d3ee' },
  github:  { emoji: '⬡', label: 'GitHub Copilot', color: '#a1a1aa' },
};

function providerMeta(p) {
  return PROVIDERS[p] || { emoji: '⬡', label: p, color: '#6b7280' };
}

// ─────────────────────────────────────────────
// Charts
// ─────────────────────────────────────────────
let requestsChart = null;
let providersChart = null;

function initCharts() {
  Chart.defaults.color = 'hsl(215, 15%, 60%)';
  Chart.defaults.borderColor = 'hsl(225, 20%, 18%)';
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

  // Requests over time
  const ctxR = document.getElementById('chart-requests').getContext('2d');
  requestsChart = new Chart(ctxR, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Requests',
        data: [],
        borderColor: 'hsl(260, 80%, 68%)',
        backgroundColor: 'hsla(260, 80%, 68%, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'hsl(260, 80%, 68%)',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'hsla(225,20%,18%,0.8)' }, ticks: { maxTicksLimit: 7 } },
        y: { grid: { color: 'hsla(225,20%,18%,0.8)' }, beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });

  // Requests by provider (doughnut)
  const ctxP = document.getElementById('chart-providers').getContext('2d');
  providersChart = new Chart(ctxP, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0, hoverOffset: 6 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10 } }
      }
    }
  });
}

function updateCharts(stats) {
  // Histogram
  const days = Object.keys(stats.histogram || {});
  const counts = Object.values(stats.histogram || {});
  requestsChart.data.labels = days.map(d => {
    const parts = d.split('-');
    return `${parts[1]}/${parts[2]}`;
  });
  requestsChart.data.datasets[0].data = counts;
  requestsChart.update('none');

  // By provider
  const byProvider = stats.byProvider || {};
  const labels = Object.keys(byProvider);
  const values = labels.map(p => byProvider[p].requests);
  const colors = labels.map(p => providerMeta(p).color);
  providersChart.data.labels = labels.map(p => providerMeta(p).label);
  providersChart.data.datasets[0].data = values;
  providersChart.data.datasets[0].backgroundColor = colors;
  providersChart.update('none');
}

// ─────────────────────────────────────────────
// Stat Card Updates
// ─────────────────────────────────────────────
function formatNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

async function loadStats() {
  try {
    const res = await fetch(`${BASE}/api/stats`);
    if (!res.ok) return;
    const stats = await res.json();

    document.getElementById('stat-requests').textContent  = formatNum(stats.totalRequests);
    document.getElementById('stat-tokens-in').textContent  = formatNum(stats.totalTokensIn);
    document.getElementById('stat-tokens-out').textContent = formatNum(stats.totalTokensOut);
    document.getElementById('stat-saved').textContent      = formatNum(stats.totalSaved);
    document.getElementById('stat-latency').textContent    = stats.avgLatency ? `${stats.avgLatency}ms` : '—';

    const connections = await fetch(`${BASE}/api/connections`).then(r => r.json()).catch(() => []);
    const active = connections.filter(c => c.status === 'active').length;
    document.getElementById('stat-accounts').textContent = String(active);

    updateCharts(stats);
    updateProxyStatus(true);
  } catch {
    updateProxyStatus(false);
  }
}

// ─────────────────────────────────────────────
// Connections
// ─────────────────────────────────────────────
async function loadConnections() {
  const list = document.getElementById('connections-list');
  try {
    const connections = await fetch(`${BASE}/api/connections`).then(r => r.json());

    if (connections.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔌</div>
          <h3>No accounts connected</h3>
          <p>Click "Add Account" to connect Claude, Gemini, Codex, Kiro, or GitHub Copilot.</p>
        </div>`;
      return;
    }

    list.innerHTML = connections.map(conn => {
      const meta = providerMeta(conn.provider);
      const statusBadge = conn.status === 'active'
        ? `<span class="badge badge--active">● Active</span>`
        : `<span class="badge badge--error">● Error</span>`;

      return `
        <div class="connection-card" id="conn-${conn.id}">
          <div class="connection-avatar avatar--${conn.provider}">${meta.emoji}</div>
          <div class="connection-info">
            <div class="connection-name">${escHtml(conn.displayName || conn.email)}</div>
            <div class="connection-meta">
              <span class="connection-provider">${meta.label}</span>
              ${statusBadge}
            </div>
          </div>
          <div class="connection-actions">
            <button class="btn btn-danger" onclick="app.removeConnection('${conn.id}')">Remove</button>
          </div>
        </div>`;
    }).join('');
  } catch {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Could not load connections</h3><p>Make sure the RouterKit proxy server is running.</p></div>`;
  }
}

// ─────────────────────────────────────────────
// Logs
// ─────────────────────────────────────────────
async function loadLogs() {
  const provider = document.getElementById('logs-provider-filter').value;
  const tbody = document.getElementById('logs-tbody');
  try {
    const params = new URLSearchParams({ limit: 200 });
    if (provider) params.set('provider', provider);
    const logs = await fetch(`${BASE}/api/logs?${params}`).then(r => r.json());

    if (!logs.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="log-empty">No logs yet — send a request to begin.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const meta = providerMeta(log.provider);
      const statusClass = log.status >= 200 && log.status < 300 ? 'log-status-ok' : 'log-status-err';
      const saved = log.tokensSaved > 0 ? `<span class="log-saved">+${formatNum(log.tokensSaved)}</span>` : '—';
      return `
        <tr>
          <td>${time}</td>
          <td>${meta.label}</td>
          <td>${escHtml(log.model || '—')}</td>
          <td>${formatNum(log.tokensIn || 0)}</td>
          <td>${formatNum(log.tokensOut || 0)}</td>
          <td>${saved}</td>
          <td>${log.latencyMs || 0}ms</td>
          <td class="${statusClass}">${log.status || '—'}</td>
        </tr>`;
    }).join('');
  } catch {
    tbody.innerHTML = `<tr><td colspan="8" class="log-empty">Error loading logs.</td></tr>`;
  }
}

// ─────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────
async function loadSettings() {
  try {
    const settings = await fetch(`${BASE}/api/settings`).then(r => r.json());
    if (settings.rtk !== undefined) document.getElementById('setting-rtk').checked = settings.rtk !== false;
    if (settings.autorefresh !== undefined) document.getElementById('setting-autorefresh').checked = settings.autorefresh !== false;
    if (settings.routing === 'priority') document.getElementById('routing-priority').checked = true;
  } catch { /* server not yet running */ }
}

async function saveSettings() {
  const rtk         = document.getElementById('setting-rtk').checked;
  const autorefresh = document.getElementById('setting-autorefresh').checked;
  const routing     = document.querySelector('input[name="routing"]:checked')?.value || 'round-robin';

  try {
    await fetch(`${BASE}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rtk, autorefresh, routing }),
    });
    const saved = document.getElementById('settings-saved');
    saved.classList.remove('hidden');
    setTimeout(() => saved.classList.add('hidden'), 3000);
  } catch { alert('Could not save settings — is the proxy server running?'); }
}

// ─────────────────────────────────────────────
// OAuth Flow (opens server-side login via port)
// ─────────────────────────────────────────────
async function startOAuth(provider) {
  const statusEl  = document.getElementById('oauth-status');
  const statusTxt = document.getElementById('oauth-status-text');
  const grid      = document.getElementById('provider-grid');

  grid.classList.add('hidden');
  statusEl.classList.remove('hidden');
  statusTxt.textContent = `Opening browser for ${providerMeta(provider).label} login…`;

  try {
    // Trigger the OAuth flow on the server side via a special endpoint
    const res = await fetch(`${BASE}/api/oauth/start?provider=${provider}`, { method: 'POST' });
    if (!res.ok) throw new Error(await res.text());

    statusTxt.textContent = 'Waiting for browser authentication…';

    // Poll for completion
    const maxAttempts = 120; // up to 2 minutes
    for (let i = 0; i < maxAttempts; i++) {
      await sleep(1000);
      const check = await fetch(`${BASE}/api/oauth/status?provider=${provider}`).then(r => r.json()).catch(() => ({}));
      if (check.done) {
        statusTxt.textContent = '✅ Connected!';
        await sleep(1200);
        closeModal();
        app.refresh();
        return;
      }
    }

    throw new Error('Authentication timed out.');
  } catch (err) {
    statusTxt.textContent = `❌ ${err.message}`;
    await sleep(3000);
    grid.classList.remove('hidden');
    statusEl.classList.add('hidden');
  }
}

// ─────────────────────────────────────────────
// Tab Navigation
// ─────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));

  document.getElementById(`nav-${tab}`)?.classList.add('active');
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.getElementById('page-title').textContent = tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ');

  if (tab === 'analytics')    loadStats();
  if (tab === 'connections')  loadConnections();
  if (tab === 'logs')         loadLogs();
  if (tab === 'settings')     loadSettings();
}

// ─────────────────────────────────────────────
// Proxy Status
// ─────────────────────────────────────────────
function updateProxyStatus(online) {
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (online) {
    dot.className  = 'status-dot online';
    text.textContent = 'Proxy Online';
  } else {
    dot.className  = 'status-dot offline';
    text.textContent = 'Proxy Offline';
  }
}

// ─────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showAddModal() {
  const grid = document.getElementById('provider-grid');
  const status = document.getElementById('oauth-status');
  grid.classList.remove('hidden');
  status.classList.add('hidden');
  document.getElementById('modal-backdrop').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
}

async function removeConnection(id) {
  if (!confirm('Remove this account?')) return;
  await fetch(`${BASE}/api/connections/${id}`, { method: 'DELETE' }).catch(() => {});
  loadConnections();
  loadStats();
}

// ─────────────────────────────────────────────
// App Object
// ─────────────────────────────────────────────
window.app = {
  refresh() {
    const activeTab = document.querySelector('.tab-content.active')?.id.replace('tab-', '') || 'analytics';
    switchTab(activeTab);
  },
  showAddModal,
  closeModal,
  startOAuth,
  loadLogs,
  saveSettings,
  removeConnection,
};

// ─────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  switchTab('analytics');

  // Nav listeners
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(el.dataset.tab);
    });
  });

  // Auto-refresh every 15 seconds
  setInterval(() => {
    const activeTab = document.querySelector('.tab-content.active')?.id.replace('tab-', '');
    if (activeTab === 'analytics') loadStats();
    if (activeTab === 'logs')      loadLogs();
  }, 15_000);
});
