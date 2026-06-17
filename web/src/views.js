import { state, PROVIDERS, fmt, pct } from './state.js';

// ── SVG icons ─────────────────────────────────────────────────
const ICONS = {
  overview:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  accounts:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  logs:      `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>`,
  quota:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>`,
  billing:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  team:      `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  settings:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  rtk:       `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  plus:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  refresh:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  export:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  trash:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  up:        `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>`,
  dn:        `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>`,
  check:     `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`,
  warn:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};

// ── Helpers ────────────────────────────────────────────────────
function h(tag, cls, inner = '') {
  return `<${tag} class="${cls}">${inner}</${tag}>`;
}
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function provPill(prov) {
  const p = PROVIDERS[prov] || { emoji:'?', label: prov, cls: '' };
  return `<span class="prov-pill"><span class="prov-dot pd-${p.cls}">${p.emoji}</span><span>${p.label}</span></span>`;
}
function statusBadge(s) {
  if (s === 'active')  return `<span class="badge badge-ok">${ICONS.check} Active</span>`;
  if (s === 'warning') return `<span class="badge badge-warn">${ICONS.warn} Warning</span>`;
  if (s === 'pending') return `<span class="badge badge-neutral">Pending</span>`;
  return `<span class="badge badge-err">Error</span>`;
}

// ── Sidebar ────────────────────────────────────────────────────
export function renderSidebar() {
  const nav = [
    { id:'overview',  label:'Overview',    icon:'overview' },
    { id:'accounts',  label:'AI Accounts', icon:'accounts' },
    { id:'quota',     label:'Quota Tracker',icon:'quota' },
    { id:'logs',      label:'Request Logs', icon:'logs' },
    { group: 'Manage' },
    { id:'billing',   label:'Billing',     icon:'billing' },
    { id:'team',      label:'Team Access',  icon:'team' },
    { id:'settings',  label:'Settings',    icon:'settings' },
  ];

  const items = nav.map(n => {
    if (n.group) return `<div class="rk-nav-group">${n.group}</div>`;
    const active = state.view === n.id ? ' active' : '';
    const badge = n.id === 'quota'
      ? `<span class="rk-nav-badge warn">1</span>` : '';
    return `<div class="rk-nav-item${active}" data-view="${n.id}">${ICONS[n.icon]}${n.label}${badge}</div>`;
  }).join('');

  return `
    <div class="rk-brand">
      <div class="rk-brand-mark">RK</div>
      <div class="rk-brand-name">RouterKit</div>
    </div>
    <nav class="rk-nav">${items}</nav>
    <div class="rk-sidebar-footer">
      <button class="rk-team-btn" id="btn-team-switcher">
        <div class="rk-team-avatar">AC</div>
        <div class="rk-team-info">
          <div class="rk-team-name">Acme Corp</div>
          <div class="rk-team-plan">Pro Plan</div>
        </div>
      </button>
    </div>`;
}

// ── Topbar ─────────────────────────────────────────────────────
const TOPBAR_META = {
  overview: { title: 'Overview',      sub: 'Platform summary' },
  accounts: { title: 'AI Accounts',   sub: 'Manage connected providers' },
  quota:    { title: 'Quota Tracker', sub: 'Real-time usage & limits' },
  logs:     { title: 'Request Logs',  sub: 'Full audit trail' },
  billing:  { title: 'Billing',       sub: 'Costs & invoices' },
  team:     { title: 'Team Access',   sub: 'Members & permissions' },
  settings: { title: 'Settings',      sub: 'Configuration & integrations' },
};
export function renderTopbar() {
  const m = TOPBAR_META[state.view] || { title: state.view, sub:'' };
  return `
    <div>
      <div class="rk-topbar-title">${m.title}</div>
      <div class="rk-topbar-subtitle">${m.sub}</div>
    </div>
    <div class="rk-topbar-spacer"></div>
    <div class="rk-topbar-actions">
      <button class="btn btn-ghost btn-icon" id="btn-topbar-refresh" title="Refresh">${ICONS.refresh}</button>
      ${state.view === 'accounts' ? `<button class="btn btn-primary" id="btn-add-account">${ICONS.plus} Add Account</button>` : ''}
      ${state.view === 'team' ? `<button class="btn btn-primary" id="btn-invite">${ICONS.plus} Invite Member</button>` : ''}
      ${state.view === 'logs' ? `<button class="btn btn-outline btn-sm" id="btn-export-logs">${ICONS.export} Export</button>` : ''}
    </div>`;
}

// ── Overview View ──────────────────────────────────────────────
export function renderOverview(charts) {
  const totalReq  = state.accounts.reduce((s,a) => s + a.requests, 0);
  const totalCost = state.accounts.reduce((s,a) => s + a.cost, 0).toFixed(2);
  const totalSaved = state.logs.reduce((s,l) => s + (l.saved||0), 0);
  const activeCount = state.accounts.filter(a => a.status === 'active').length;
  const warnCount   = state.accounts.filter(a => a.status === 'warning').length;

  return `
    <div class="rk-view active animate-in" id="view-overview">
      <div class="metrics-grid">
        <div class="metric-card c-v">
          <div class="metric-top">
            <div class="metric-icon ic-v">${ICONS.accounts}</div>
            <div class="metric-trend up">${ICONS.up} 12%</div>
          </div>
          <div class="metric-val">${fmt(totalReq)}</div>
          <div class="metric-lbl">Total Requests</div>
        </div>
        <div class="metric-card c-g">
          <div class="metric-top">
            <div class="metric-icon ic-g">${ICONS.accounts}</div>
            <div class="metric-trend up">${ICONS.up} 3</div>
          </div>
          <div class="metric-val">${activeCount}</div>
          <div class="metric-lbl">Active Accounts</div>
        </div>
        <div class="metric-card c-a">
          <div class="metric-top">
            <div class="metric-icon ic-a">${ICONS.billing}</div>
            <div class="metric-trend dn">${ICONS.dn} 5%</div>
          </div>
          <div class="metric-val">$${totalCost}</div>
          <div class="metric-lbl">This Month Cost</div>
        </div>
        <div class="metric-card c-t">
          <div class="metric-top">
            <div class="metric-icon ic-t">${ICONS.rtk}</div>
            <div class="metric-trend up">${ICONS.up} RTK</div>
          </div>
          <div class="metric-val">${fmt(totalSaved)}</div>
          <div class="metric-lbl">Tokens Saved (RTK)</div>
        </div>
        <div class="metric-card c-r">
          <div class="metric-top">
            <div class="metric-icon ic-r">${ICONS.warn}</div>
          </div>
          <div class="metric-val">${warnCount}</div>
          <div class="metric-lbl">Quota Warnings</div>
        </div>
        <div class="metric-card c-b">
          <div class="metric-top">
            <div class="metric-icon ic-b">${ICONS.refresh}</div>
            <div class="metric-trend up">${ICONS.up} 99%</div>
          </div>
          <div class="metric-val">99.4%</div>
          <div class="metric-lbl">Uptime</div>
        </div>
      </div>

      <div class="charts-row">
        <div class="chart-panel">
          <div class="chart-panel-hdr">
            <div>
              <div class="chart-panel-title">Request Volume</div>
              <div class="chart-panel-sub">Last 7 days across all providers</div>
            </div>
          </div>
          <div class="chart-body"><canvas id="chart-volume"></canvas></div>
        </div>
        <div class="chart-panel">
          <div class="chart-panel-hdr">
            <div>
              <div class="chart-panel-title">Provider Share</div>
              <div class="chart-panel-sub">By request count</div>
            </div>
          </div>
          <div class="chart-body"><canvas id="chart-share"></canvas></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-hdr">
          <div class="panel-title">Recent Requests</div>
          <div class="panel-actions">
            <button class="btn btn-ghost btn-sm" data-view="logs">View All</button>
          </div>
        </div>
        ${renderLogsTable(state.logs.slice(0,5))}
      </div>
    </div>`;
}

// ── Accounts View ──────────────────────────────────────────────
export function renderAccounts() {
  const rows = state.accounts.map(a => {
    const used = pct(a.tokensUsed, a.tokensLimit);
    return `
      <tr>
        <td>${provPill(a.provider)}</td>
        <td class="mono">${esc(a.name)}</td>
        <td><span class="badge badge-v">${esc(a.plan)}</span></td>
        <td>
          <div class="quota-bar">
            <div class="quota-track"><div class="quota-fill${used>90?' warn':''}" style="width:${used}%"></div></div>
            <div class="quota-labels"><span>${fmt(a.tokensUsed)} used</span><span>${used}%</span></div>
          </div>
        </td>
        <td>${fmt(a.requests)}</td>
        <td>$${a.cost.toFixed(2)}</td>
        <td>${statusBadge(a.status)}</td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm btn-icon" title="Refresh token" data-action="refresh-token" data-id="${a.id}">${ICONS.refresh}</button>
            <button class="btn btn-danger btn-sm btn-icon" title="Remove" data-action="remove-account" data-id="${a.id}">${ICONS.trash}</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="rk-view active animate-in" id="view-accounts">
      <div class="panel">
        <table class="rk-table">
          <thead><tr>
            <th>Provider</th>
            <th>Account</th>
            <th>Plan</th>
            <th style="min-width:160px">Token Usage</th>
            <th>Requests</th>
            <th>Cost</th>
            <th>Status</th>
            <th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

// ── Quota View ─────────────────────────────────────────────────
export function renderQuota() {
  const cards = state.accounts.map(a => {
    const used = pct(a.tokensUsed, a.tokensLimit);
    const warn = used > 88;
    const p = PROVIDERS[a.provider];
    return `
      <div class="metric-card c-${warn?'r':'v'}">
        <div class="metric-top">
          <div class="prov-pill"><span class="prov-dot pd-${p.cls}">${p.emoji}</span><strong>${p.label}</strong></div>
          ${warn ? `<span class="badge badge-err">Near Limit</span>` : `<span class="badge badge-ok">OK</span>`}
        </div>
        <div style="margin:8px 0">
          <div class="quota-track" style="height:8px;border-radius:4px">
            <div class="quota-fill${warn?' warn':''}" style="width:${used}%;height:100%;border-radius:4px"></div>
          </div>
        </div>
        <div class="flex items-center gap-2" style="justify-content:space-between;margin-top:4px">
          <span class="metric-val" style="font-size:22px">${used}%</span>
          <div style="text-align:right">
            <div style="font-size:13px;font-weight:600">${fmt(a.tokensUsed)} / ${fmt(a.tokensLimit)}</div>
            <div class="text-muted" style="font-size:11px">tokens used</div>
          </div>
        </div>
        <div style="font-size:11.5px;color:var(--t3);margin-top:4px">${esc(a.name)}</div>
      </div>`;
  }).join('');

  return `
    <div class="rk-view active animate-in" id="view-quota">
      <div class="metrics-grid">${cards}</div>
      <div class="panel">
        <div class="panel-hdr"><div class="panel-title">RTK Token Saver ⭐</div></div>
        <div style="padding:24px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
          <div style="text-align:center">
            <div style="font-size:32px;font-weight:800;background:linear-gradient(135deg,#7c3aed,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">1.34M</div>
            <div class="text-muted" style="font-size:12px;margin-top:4px">Total tokens compressed</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:32px;font-weight:800;color:var(--green)">$14.20</div>
            <div class="text-muted" style="font-size:12px;margin-top:4px">Estimated cost saved</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:32px;font-weight:800;color:var(--amber)">38%</div>
            <div class="text-muted" style="font-size:12px;margin-top:4px">Avg compression ratio</div>
          </div>
        </div>
      </div>
    </div>`;
}

// ── Logs View ──────────────────────────────────────────────────
function renderLogsTable(logs) {
  if (!logs.length) return `<div class="empty"><div class="empty-icon">📭</div><h3>No logs yet</h3><p>Requests will appear here automatically.</p></div>`;
  const rows = logs.map(l => {
    const sc = l.status >= 200 && l.status < 300 ? 'text-green' : 'text-red';
    return `
      <tr>
        <td class="mono text-muted">${esc(l.ts)}</td>
        <td>${provPill(l.provider)}</td>
        <td><span class="tag">${esc(l.model)}</span></td>
        <td class="mono">${fmt(l.tokIn)}</td>
        <td class="mono">${fmt(l.tokOut)}</td>
        <td class="mono text-green">${l.saved > 0 ? '+'+fmt(l.saved) : '—'}</td>
        <td class="mono">${l.ms}ms</td>
        <td class="mono ${sc}">${l.status}</td>
      </tr>`;
  }).join('');
  return `
    <table class="rk-table">
      <thead><tr><th>Time</th><th>Provider</th><th>Model</th><th>Tok In</th><th>Tok Out</th><th>RTK Saved</th><th>Latency</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function renderLogs() {
  return `
    <div class="rk-view active animate-in" id="view-logs">
      <div class="panel">
        <div class="panel-hdr">
          <div class="panel-title">Request Audit Log</div>
          <div class="panel-actions">
            <select class="form-select" style="width:160px;padding:6px 10px;font-size:12.5px" id="filter-provider">
              <option value="">All Providers</option>
              ${Object.entries(PROVIDERS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="logs-body">${renderLogsTable(state.logs)}</div>
      </div>
    </div>`;
}

// ── Billing View ───────────────────────────────────────────────
export function renderBilling() {
  const invoices = [
    { date:'Jun 2025', amount:'$56.80', status:'paid',   id:'INV-2025-006' },
    { date:'May 2025', amount:'$48.40', status:'paid',   id:'INV-2025-005' },
    { date:'Apr 2025', amount:'$61.20', status:'paid',   id:'INV-2025-004' },
  ];
  return `
    <div class="rk-view active animate-in" id="view-billing">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
        <div class="metric-card c-a">
          <div class="metric-top"><div class="metric-icon ic-a">${ICONS.billing}</div></div>
          <div class="metric-val">$56.80</div>
          <div class="metric-lbl">Current Month</div>
        </div>
        <div class="metric-card c-g">
          <div class="metric-top"><div class="metric-icon ic-g">${ICONS.rtk}</div></div>
          <div class="metric-val">$14.20</div>
          <div class="metric-lbl">Saved by RTK</div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-hdr">
          <div class="panel-title">Billing History</div>
          <button class="btn btn-outline btn-sm">${ICONS.export} Download All</button>
        </div>
        <table class="rk-table">
          <thead><tr><th>Period</th><th>Invoice ID</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${invoices.map(inv=>`
              <tr>
                <td>${inv.date}</td>
                <td class="mono">${inv.id}</td>
                <td style="font-weight:700">${inv.amount}</td>
                <td><span class="badge badge-ok">${ICONS.check} ${inv.status}</span></td>
                <td><button class="btn btn-ghost btn-sm">${ICONS.export} PDF</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── Team View ──────────────────────────────────────────────────
export function renderTeam() {
  const rows = state.members.map(m => `
    <tr>
      <td>
        <div class="flex items-center gap-2">
          <div style="width:32px;height:32px;border-radius:8px;background:var(--a-grad);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${m.avatar}</div>
          <div>
            <div style="font-weight:600">${esc(m.name)}</div>
            <div class="mono" style="font-size:11.5px;color:var(--t3)">${esc(m.email)}</div>
          </div>
        </div>
      </td>
      <td><span class="badge ${m.role==='Owner'?'badge-v':m.role==='Admin'?'badge-warn':'badge-neutral'}">${m.role}</span></td>
      <td>${statusBadge(m.status)}</td>
      <td>
        ${m.role !== 'Owner' ? `<button class="btn btn-danger btn-sm btn-icon" data-action="remove-member" data-id="${m.id}">${ICONS.trash}</button>` : ''}
      </td>
    </tr>`).join('');

  return `
    <div class="rk-view active animate-in" id="view-team">
      <div class="panel">
        <div class="panel-hdr">
          <div class="panel-title">${state.members.length} Members</div>
        </div>
        <table class="rk-table">
          <thead><tr><th>Member</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

// ── Settings View ──────────────────────────────────────────────
export function renderSettings() {
  return `
    <div class="rk-view active animate-in" id="view-settings">
      <div style="max-width:680px;display:flex;flex-direction:column;gap:14px">
        <div class="panel" style="padding:20px 24px">
          <div class="panel-title" style="margin-bottom:16px">Routing & RTK</div>
          <div class="toggle-row">
            <div class="toggle-left">
              <div class="toggle-lbl">RTK Token Saver</div>
              <div class="toggle-desc">Automatically compress git diffs, grep output, and FS listings before sending to AI.</div>
            </div>
            <label class="toggle-ctrl"><input type="checkbox" checked id="s-rtk"><span class="toggle-track"></span></label>
          </div>
          <div class="toggle-row">
            <div class="toggle-left">
              <div class="toggle-lbl">Auto Token Refresh</div>
              <div class="toggle-desc">Silently refresh OAuth tokens before they expire.</div>
            </div>
            <label class="toggle-ctrl"><input type="checkbox" checked id="s-refresh"><span class="toggle-track"></span></label>
          </div>
          <div class="toggle-row">
            <div class="toggle-left">
              <div class="toggle-lbl">Format Translation</div>
              <div class="toggle-desc">Auto-translate between OpenAI, Anthropic, and Gemini request formats.</div>
            </div>
            <label class="toggle-ctrl"><input type="checkbox" checked id="s-translate"><span class="toggle-track"></span></label>
          </div>
          <div class="toggle-row">
            <div class="toggle-left">
              <div class="toggle-lbl">Round-Robin Routing</div>
              <div class="toggle-desc">Distribute requests evenly across active accounts.</div>
            </div>
            <label class="toggle-ctrl"><input type="checkbox" checked id="s-rr"><span class="toggle-track"></span></label>
          </div>
        </div>

        <div class="panel" style="padding:20px 24px">
          <div class="panel-title" style="margin-bottom:16px">API Integration</div>
          <div class="form-group">
            <label class="form-label">RouterKit Endpoint</label>
            <input class="form-input mono" readonly value="https://api.routerkit.io/v1/chat/completions" />
            <div class="form-hint">Use this as your OpenAI-compatible base URL in any AI client.</div>
          </div>
          <div class="form-group">
            <label class="form-label">API Key</label>
            <input class="form-input mono" readonly value="rk-••••••••••••••••••••••••••••" />
          </div>
        </div>

        <button class="btn btn-primary" style="align-self:flex-start" id="btn-save-settings">Save Settings</button>
      </div>
    </div>`;
}

// ── Add Account Modal ──────────────────────────────────────────
export function renderAddModal() {
  const cards = Object.entries(PROVIDERS).map(([key, p]) => `
    <div class="prov-card" data-provider="${key}" id="prov-card-${key}">
      <div class="prov-card-icon pd-${p.cls}">${p.emoji}</div>
      <div class="prov-card-name">${p.label}</div>
      <div class="prov-card-type">OAuth / SSO</div>
    </div>`).join('');

  return `
    <div class="modal-veil hidden" id="modal-add">
      <div class="modal-box" onclick="event.stopPropagation()">
        <div class="modal-hdr">
          <div class="modal-title">Connect AI Provider</div>
          <button class="modal-close" id="btn-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px;color:var(--t3);margin-bottom:18px">Choose a provider to authenticate. A browser window will open for the OAuth flow.</p>

          <!-- Provider Selection Grid -->
          <div class="prov-grid" id="prov-grid">${cards}</div>

          <!-- Spinner / Status (PKCE flows) -->
          <div class="hidden" id="oauth-flow" style="padding:16px;background:var(--s3);border-radius:var(--rm);display:flex;align-items:center;gap:14px">
            <div class="spinner" id="oauth-spinner"></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13.5px" id="oauth-status-title">Authenticating…</div>
              <div style="font-size:12px;color:var(--t3);margin-top:2px;word-break:break-all" id="oauth-status-sub">Waiting for browser confirmation</div>
            </div>
          </div>

          <!-- Device Code Panel (GitHub) -->
          <div class="hidden" id="oauth-device" style="padding:18px;background:var(--s3);border-radius:var(--rm)">
            <div style="font-size:12px;color:var(--t3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;font-weight:700">Enter this code on GitHub</div>
            <div id="device-code" style="font-family:'Fira Code',monospace;font-size:28px;font-weight:700;letter-spacing:6px;color:var(--t1);text-align:center;padding:12px 0"></div>
            <div style="text-align:center;margin-top:8px">
              <a id="device-url" href="https://github.com/login/device" target="_blank"
                 style="color:var(--a-v2);font-size:13px;text-decoration:underline">github.com/login/device ↗</a>
            </div>
            <div style="font-size:12px;color:var(--t3);text-align:center;margin-top:12px" id="device-status">Waiting for you to enter the code…</div>
          </div>

          <!-- Deferred / Notice Panel -->
          <div class="hidden" id="oauth-deferred" style="padding:16px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);border-radius:var(--rm)">
            <div style="font-weight:700;font-size:13.5px;color:var(--amber);margin-bottom:6px" id="deferred-title">Browser opened</div>
            <div style="font-size:12.5px;color:var(--t2);line-height:1.7" id="deferred-note"></div>
          </div>

          <!-- Back button -->
          <button class="hidden btn btn-ghost btn-sm" id="btn-back-providers" style="margin-top:14px" onclick="document.getElementById('prov-grid').classList.remove('hidden');document.getElementById('oauth-flow').classList.add('hidden');document.getElementById('oauth-device').classList.add('hidden');document.getElementById('oauth-deferred').classList.add('hidden');document.getElementById('btn-back-providers').classList.add('hidden');">
            ← Choose different provider
          </button>
        </div>
      </div>
    </div>`;
}
