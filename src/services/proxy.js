/**
 * RouterKit — proxy.js
 * Core proxy server: multi-account routing, RTK compression, format translation,
 * auto token refresh, request logging, and embedded dashboard.
 */

import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { rtkCompress, estimateTokens } from "./rtk.js";
import { translateRequest, translateResponse } from "./translator.js";
import {
  getConnections,
  getConnection,
  upsertConnection,
  logRequest,
  getUsageLogs,
  getUsageStats,
  getSettings,
  saveSetting,
  updateConnectionTokens,
  setConnectionStatus,
  removeConnection,
} from "./db.js";

import { ClaudeService } from "./claude.js";
import { CodexService } from "./codex.js";
import { GeminiService } from "./gemini.js";
import { KiroService } from "./kiro.js";
import { GithubService } from "./github.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIR = join(__dirname, "..", "dashboard");

const activeAuths = new Map();

// ─────────────────────────────────────────────
// Provider API Endpoints
// ─────────────────────────────────────────────

const PROVIDER_ENDPOINTS = {
  claude: {
    host: "api.anthropic.com",
    path: "/v1/messages",
    version: "2023-06-01",
  },
  codex: {
    host: "api.openai.com",
    path: "/v1/chat/completions",
  },
  gemini: {
    host: "generativelanguage.googleapis.com",
    path: "/v1beta/models/{model}:generateContent",
  },
  github: {
    host: "api.githubcopilot.com",
    path: "/chat/completions",
  },
};

// ─────────────────────────────────────────────
// Token Refresh Helpers
// ─────────────────────────────────────────────

async function refreshClaudeToken(conn) {
  const { tokens } = conn;
  if (!tokens?.refresh_token) return null;

  const body = JSON.stringify({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "api.anthropic.com",
        path: "/v1/oauth/token",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.write(body);
    req.end();
  });
}

async function refreshGeminiToken(conn) {
  const { tokens } = conn;
  if (!tokens?.refresh_token) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com",
    client_secret: "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",
  }).toString();

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "oauth2.googleapis.com",
        path: "/token",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.write(body);
    req.end();
  });
}

async function tryRefreshToken(conn) {
  let newTokens = null;
  if (conn.provider === "claude") newTokens = await refreshClaudeToken(conn);
  else if (conn.provider === "gemini" || conn.provider === "antigravity") newTokens = await refreshGeminiToken(conn);

  if (newTokens?.access_token) {
    updateConnectionTokens(conn.id, newTokens);
    return { ...conn.tokens, ...newTokens };
  }
  return null;
}

// ─────────────────────────────────────────────
// Build Provider Request Options
// ─────────────────────────────────────────────

function buildProviderRequest(conn, requestBody) {
  const { provider, tokens } = conn;
  const ep = PROVIDER_ENDPOINTS[provider];
  if (!ep) throw new Error(`Unsupported provider: ${provider}`);

  const accessToken = tokens?.access_token || tokens?.token || tokens?.copilot_token;
  const translatedBody = translateRequest(requestBody, "openai", provider);

  let path = ep.path;
  if (provider === "gemini") {
    const model = requestBody.model || "gemini-1.5-pro";
    path = path.replace("{model}", model);
    path += `?key=${tokens?.api_key || ""}`;
  }

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "RouterKit/1.0",
  };

  if (provider === "claude") {
    headers["anthropic-version"] = ep.version;
    headers["Authorization"] = `Bearer ${accessToken}`;
  } else if (provider === "gemini") {
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  } else {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if (provider === "github") {
    headers["Copilot-Integration-Id"] = "vscode-chat";
    headers["editor-version"] = "vscode/1.90.0";
  }

  return {
    hostname: ep.host,
    path,
    method: "POST",
    headers,
    body: JSON.stringify(translatedBody),
  };
}

// ─────────────────────────────────────────────
// Forward request to provider
// ─────────────────────────────────────────────

function forwardToProvider(options) {
  return new Promise((resolve, reject) => {
    const { hostname, path, method, headers, body } = options;
    const bodyBuffer = Buffer.from(body);
    headers["Content-Length"] = bodyBuffer.length;

    const req = https.request({ hostname, path, method, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), raw: data });
        } catch {
          resolve({ status: res.statusCode, body: {}, raw: data });
        }
      });
    });
    req.on("error", reject);
    req.write(bodyBuffer);
    req.end();
  });
}

// ─────────────────────────────────────────────
// CORS + JSON helpers
// ─────────────────────────────────────────────

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

function jsonResponse(res, statusCode, data) {
  setCORS(res);
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}

function serveStatic(res, filePath, contentType) {
  if (existsSync(filePath)) {
    const content = readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
}

// ─────────────────────────────────────────────
// Main RouterProxy Class
// ─────────────────────────────────────────────

export class RouterProxy {
  constructor(options = {}) {
    this.port = options.port || 20128;
    this.rtkEnabled = options.rtk !== false;
    this.server = null;
    this._roundRobinIndex = 0;
  }

  /** Pick the next active connection using round-robin + priority */
  _pickConnection(preferProvider = null) {
    const connections = getConnections().filter((c) => c.status === "active");
    if (connections.length === 0) return null;

    const sorted = [...connections].sort((a, b) => (a.priority || 99) - (b.priority || 99));
    if (preferProvider) {
      const preferred = sorted.find((c) => c.provider === preferProvider);
      if (preferred) return preferred;
    }

    const conn = sorted[this._roundRobinIndex % sorted.length];
    this._roundRobinIndex++;
    return conn;
  }

  /** Handle /v1/chat/completions */
  async _handleChatCompletions(req, res) {
    const startTime = Date.now();
    let requestBody;
    try {
      requestBody = await readBody(req);
    } catch {
      return jsonResponse(res, 400, { error: "Invalid JSON body" });
    }

    // RTK Compression
    let tokensSaved = 0;
    let originalTokens = 0;
    if (this.rtkEnabled) {
      const { body, originalTokenEstimate, savedTokenEstimate } = rtkCompress(requestBody);
      requestBody = body;
      originalTokens = originalTokenEstimate;
      tokensSaved = savedTokenEstimate;
    } else {
      originalTokens = estimateTokens(JSON.stringify(requestBody));
    }

    const conn = this._pickConnection();
    if (!conn) {
      return jsonResponse(res, 503, {
        error: "No active connections. Add an account via the dashboard.",
      });
    }

    let providerOpts;
    try {
      providerOpts = buildProviderRequest(conn, requestBody);
    } catch (err) {
      return jsonResponse(res, 500, { error: err.message });
    }

    let result;
    try {
      result = await forwardToProvider(providerOpts);
    } catch (err) {
      // Mark connection as errored, try refresh
      setConnectionStatus(conn.id, "error");
      const refreshed = await tryRefreshToken(conn);
      if (refreshed) {
        setConnectionStatus(conn.id, "active");
        conn.tokens = refreshed;
        try {
          providerOpts = buildProviderRequest(conn, requestBody);
          result = await forwardToProvider(providerOpts);
        } catch (err2) {
          return jsonResponse(res, 502, { error: `Upstream error: ${err2.message}` });
        }
      } else {
        return jsonResponse(res, 502, { error: `Upstream error: ${err.message}` });
      }
    }

    // Translate response to OpenAI format
    const openAIResponse = translateResponse(result.body, conn.provider);
    const latencyMs = Date.now() - startTime;
    const tokensIn = openAIResponse.usage?.prompt_tokens || originalTokens;
    const tokensOut = openAIResponse.usage?.completion_tokens || 0;

    // Log to DB
    logRequest({
      provider: conn.provider,
      connectionId: conn.id,
      model: requestBody.model || "default",
      tokensIn,
      tokensOut,
      tokensSaved,
      latencyMs,
      status: result.status,
    });

    jsonResponse(res, result.status, openAIResponse);
  }

  /** Handle REST API routes for the dashboard */
  async _handleAPI(url, method, req, res) {
    const path = url.pathname;

    // GET /api/connections
    if (path === "/api/connections" && method === "GET") {
      const conns = getConnections().map((c) => ({
        ...c,
        tokens: undefined, // strip sensitive data
      }));
      return jsonResponse(res, 200, conns);
    }

    // DELETE /api/connections/:id
    if (path.startsWith("/api/connections/") && method === "DELETE") {
      const id = path.split("/").pop();
      removeConnection(id);
      return jsonResponse(res, 200, { ok: true });
    }

    // GET /api/stats
    if (path === "/api/stats" && method === "GET") {
      return jsonResponse(res, 200, getUsageStats());
    }

    // GET /api/logs
    if (path === "/api/logs" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const provider = url.searchParams.get("provider") || null;
      return jsonResponse(res, 200, getUsageLogs({ limit, provider }));
    }

    // GET /api/settings
    if (path === "/api/settings" && method === "GET") {
      return jsonResponse(res, 200, getSettings());
    }

    // POST /api/settings
    if (path === "/api/settings" && method === "POST") {
      const body = await readBody(req);
      for (const [key, val] of Object.entries(body)) {
        saveSetting(key, val);
      }
      return jsonResponse(res, 200, { ok: true });
    }

    // POST /api/oauth/start
    if (path === "/api/oauth/start" && method === "POST") {
      const provider = url.searchParams.get("provider");
      if (!provider) {
        return jsonResponse(res, 400, { error: "Provider is required" });
      }

      activeAuths.set(provider, { status: "pending" });

      let service;
      if (provider === "claude") service = new ClaudeService();
      else if (provider === "codex") service = new CodexService();
      else if (provider === "gemini") service = new GeminiService();
      else if (provider === "kiro") service = new KiroService();
      else if (provider === "github") service = new GithubService();

      if (service) {
        const connectPromise = provider === "kiro"
          ? service.connectDeviceFlow({ region: "us-east-1" })
          : service.connect();

        connectPromise
          .then((result) => {
            let email = "account";
            let displayName = provider;

            if (provider === "claude") {
              email = result.email || "claude-account";
              displayName = "Claude Account";
            } else if (provider === "gemini") {
              email = result.email || "gemini-account";
              displayName = result.email || "Gemini Account";
            } else if (provider === "codex") {
              email = result.email || "codex-account";
              displayName = result.email || "Codex Account";
            } else if (provider === "github") {
              email = result.githubEmail || result.githubLogin || "github-account";
              displayName = result.githubName || result.githubLogin || "GitHub Account";
            } else if (provider === "kiro") {
              email = result.profileArn || "kiro-account";
              displayName = "Kiro Account";
            }

            upsertConnection(provider, { email, displayName }, result);
            activeAuths.set(provider, { status: "done" });
          })
          .catch((err) => {
            console.error(`OAuth connection failed for ${provider}:`, err);
            activeAuths.set(provider, { status: "error", error: err.message });
          });

        return jsonResponse(res, 200, { ok: true });
      } else {
        activeAuths.delete(provider);
        return jsonResponse(res, 400, { error: `Unsupported provider: ${provider}` });
      }
    }

    // GET /api/oauth/status
    if (path === "/api/oauth/status" && method === "GET") {
      const provider = url.searchParams.get("provider");
      const status = activeAuths.get(provider);
      if (!status) {
        return jsonResponse(res, 200, { done: false });
      }
      if (status.status === "done") {
        activeAuths.delete(provider);
        return jsonResponse(res, 200, { done: true });
      }
      if (status.status === "error") {
        const errorMsg = status.error;
        activeAuths.delete(provider);
        return jsonResponse(res, 400, { error: errorMsg });
      }
      return jsonResponse(res, 200, { done: false });
    }

    jsonResponse(res, 404, { error: "Not found" });
  }

  start() {
    this.server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${this.port}`);
      const method = req.method.toUpperCase();

      setCORS(res);
      if (method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
      }

      // Proxy route
      if (url.pathname === "/v1/chat/completions" && method === "POST") {
        return this._handleChatCompletions(req, res);
      }

      // API routes
      if (url.pathname.startsWith("/api/")) {
        return this._handleAPI(url, method, req, res);
      }

      // Dashboard
      if (url.pathname === "/" || url.pathname === "/dashboard") {
        return serveStatic(res, join(DASHBOARD_DIR, "index.html"), "text/html; charset=utf-8");
      }
      if (url.pathname === "/dashboard/style.css" || url.pathname === "/style.css") {
        return serveStatic(res, join(DASHBOARD_DIR, "style.css"), "text/css");
      }
      if (url.pathname === "/dashboard/app.js" || url.pathname === "/app.js") {
        return serveStatic(res, join(DASHBOARD_DIR, "app.js"), "application/javascript");
      }

      res.writeHead(404);
      res.end("Not found");
    });

    this.server.listen(this.port, "0.0.0.0", () => {
      console.log(`\n┌──────────────────────────────────────────┐`);
      console.log(`│  🚀 RouterKit Proxy — Port ${this.port}          │`);
      console.log(`├──────────────────────────────────────────┤`);
      console.log(`│  Dashboard:  http://localhost:${this.port}/       │`);
      console.log(`│  Endpoint:   http://localhost:${this.port}/v1/chat/completions │`);
      console.log(`│  RTK:        ${this.rtkEnabled ? "✅ Enabled" : "⛔ Disabled"}                    │`);
      console.log(`└──────────────────────────────────────────┘\n`);
    });

    return this;
  }

  stop() {
    if (this.server) this.server.close();
  }
}
