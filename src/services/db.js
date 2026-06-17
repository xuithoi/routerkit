/**
 * RouterKit — db.js
 * SQLite-backed persistence for connections, usage logs, and settings.
 * Uses Node.js built-in node:sqlite (Node ≥ 22.5) with a JSON-file fallback.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

// Data directory: ~/.routerkit/
const DATA_DIR = join(homedir(), ".routerkit");
const DB_FILE = join(DATA_DIR, "db.json");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ─────────────────────────────────────────────
// JSON-based persistence (no native sqlite dep)
// ─────────────────────────────────────────────

function loadDB() {
  if (!existsSync(DB_FILE)) {
    return { connections: [], usage_logs: [], settings: {} };
  }
  try {
    return JSON.parse(readFileSync(DB_FILE, "utf-8"));
  } catch {
    return { connections: [], usage_logs: [], settings: {} };
  }
}

function saveDB(data) {
  writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ─────────────────────────────────────────────
// Connections
// ─────────────────────────────────────────────

export function getConnections() {
  return loadDB().connections;
}

export function getConnection(id) {
  return loadDB().connections.find((c) => c.id === id) || null;
}

export function upsertConnection(provider, accountInfo, tokens) {
  const db = loadDB();
  const existing = db.connections.find(
    (c) => c.provider === provider && c.email === accountInfo.email
  );
  const now = new Date().toISOString();

  if (existing) {
    existing.tokens = tokens;
    existing.updatedAt = now;
    existing.status = "active";
    existing.displayName = accountInfo.displayName || existing.displayName;
  } else {
    db.connections.push({
      id: randomUUID(),
      provider,
      email: accountInfo.email || `${provider}-account`,
      displayName: accountInfo.displayName || accountInfo.email || provider,
      tokens,
      status: "active",
      priority: db.connections.length + 1,
      createdAt: now,
      updatedAt: now,
    });
  }
  saveDB(db);
}

export function updateConnectionTokens(id, tokens) {
  const db = loadDB();
  const conn = db.connections.find((c) => c.id === id);
  if (conn) {
    conn.tokens = { ...conn.tokens, ...tokens };
    conn.updatedAt = new Date().toISOString();
    saveDB(db);
  }
}

export function setConnectionStatus(id, status) {
  const db = loadDB();
  const conn = db.connections.find((c) => c.id === id);
  if (conn) {
    conn.status = status;
    conn.updatedAt = new Date().toISOString();
    saveDB(db);
  }
}

export function removeConnection(id) {
  const db = loadDB();
  db.connections = db.connections.filter((c) => c.id !== id);
  saveDB(db);
}

// ─────────────────────────────────────────────
// Usage Logs
// ─────────────────────────────────────────────

const MAX_LOGS = 1000;

export function logRequest(entry) {
  const db = loadDB();
  db.usage_logs.unshift({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  // Cap log size
  if (db.usage_logs.length > MAX_LOGS) {
    db.usage_logs = db.usage_logs.slice(0, MAX_LOGS);
  }
  saveDB(db);
}

export function getUsageLogs({ limit = 100, provider = null } = {}) {
  let logs = loadDB().usage_logs;
  if (provider) logs = logs.filter((l) => l.provider === provider);
  return logs.slice(0, limit);
}

export function getUsageStats() {
  const logs = loadDB().usage_logs;
  const totalRequests = logs.length;
  const totalTokensIn = logs.reduce((s, l) => s + (l.tokensIn || 0), 0);
  const totalTokensOut = logs.reduce((s, l) => s + (l.tokensOut || 0), 0);
  const totalSaved = logs.reduce((s, l) => s + (l.tokensSaved || 0), 0);
  const avgLatency =
    logs.length > 0
      ? Math.round(logs.reduce((s, l) => s + (l.latencyMs || 0), 0) / logs.length)
      : 0;

  const byProvider = {};
  for (const log of logs) {
    if (!byProvider[log.provider]) byProvider[log.provider] = { requests: 0, tokensIn: 0, tokensOut: 0 };
    byProvider[log.provider].requests++;
    byProvider[log.provider].tokensIn += log.tokensIn || 0;
    byProvider[log.provider].tokensOut += log.tokensOut || 0;
  }

  // Last 7 days histogram
  const histogram = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    histogram[d.toISOString().slice(0, 10)] = 0;
  }
  for (const log of logs) {
    const day = log.timestamp?.slice(0, 10);
    if (histogram[day] !== undefined) histogram[day]++;
  }

  return { totalRequests, totalTokensIn, totalTokensOut, totalSaved, avgLatency, byProvider, histogram };
}

// ─────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────

export function getSettings() {
  return loadDB().settings;
}

export function saveSetting(key, value) {
  const db = loadDB();
  db.settings[key] = value;
  saveDB(db);
}
