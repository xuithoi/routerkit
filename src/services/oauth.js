import http from "http";
import { URL } from "url";
import open from "open";
import { generatePKCE } from "../pkce.js";
import { OAUTH_TIMEOUT } from "../constants.js";

export class OAuthService {
  constructor(config) {
    this.config = config;
  }

  /**
   * Start a local HTTP server on a random or fixed port to capture an OAuth callback.
   * @param {Function} onCallback - Called when code redirect hits the server.
   * @param {number} [fixedPort=0] - Fixed port to listen on, or 0 for dynamic.
   * @returns {Promise<{port: number, close: Function}>}
   */
  startCallbackServer(onCallback, fixedPort = 0) {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const url = new URL(req.url, "http://localhost");

        if (url.pathname === "/callback" || url.pathname === "/auth/callback") {
          const params = Object.fromEntries(url.searchParams);

          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(callbackHtml(true, "Authentication Successful", "You can close this tab and return to your application."));

          onCallback(params);
          return;
        }

        res.writeHead(404);
        res.end("Not found");
      });

      let settled = false;
      const fail = (err) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      server.listen(fixedPort, "127.0.0.1", () => {
        if (settled) return;
        settled = true;
        const { port } = server.address();
        resolve({
          port,
          close: () => server.close(),
        });
      });

      server.once("error", (err) => {
        if (err.code === "EADDRINUSE" && fixedPort) {
          fail(new Error(`OAuth callback port ${fixedPort} is already in use. Stop the stale RouterKit/Codex callback server and try again.`));
          return;
        }
        fail(err);
      });
    });
  }

  /**
   * Helper that starts the local server and handles standard web OAuth redirect flow.
   * @param {string} providerName - Name of the provider for console printout.
   * @param {Function} buildAuthUrlFn - Callback to build URL with port.
   * @returns {Promise<{code: string, state: string, codeVerifier: string, redirectUri: string}>}
   */
  async authenticate(providerName, buildAuthUrlFn) {
    const { codeVerifier, codeChallenge, state } = generatePKCE();

    let callbackParams = null;
    const { port, close } = await this.startCallbackServer(
      (params) => {
        callbackParams = params;
      },
      this.config.fixedPort || 0
    );

    const redirectUri = this.config.fixedPort
      ? `http://localhost:${port}${this.config.callbackPath || "/callback"}`
      : `http://localhost:${port}/callback`;

    const authUrl = buildAuthUrlFn(redirectUri, state, codeChallenge);

    console.log(`\nOpening browser for ${providerName} SSO authentication...`);
    console.log(`If the browser does not open automatically, visit:\n${authUrl}\n`);
    await open(authUrl);

    const params = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        close();
        reject(new Error("Authentication timeout"));
      }, OAUTH_TIMEOUT);

      const checkInterval = setInterval(() => {
        if (callbackParams) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          close();
          resolve(callbackParams);
        }
      }, 100);
    });

    if (params.error) {
      throw new Error(params.error_description || params.error);
    }

    if (!params.code) {
      throw new Error("No authorization code received");
    }

    if (params.state && params.state !== state) {
      throw new Error("State parameter mismatch (security verification failed)");
    }

    return {
      code: params.code,
      state: params.state || state,
      codeVerifier,
      redirectUri,
    };
  }
}

export async function tokenExchangeErrorMessage(providerName, tokenUrl, response) {
  const body = await response.text().catch(() => "");
  const contentType = response.headers?.get?.("content-type") || "";
  const cfMitigated = response.headers?.get?.("cf-mitigated") || "";
  const isHtml = contentType.includes("text/html") || /<html|<script|cdn-cgi\/challenge-platform/i.test(body);
  const isCloudflareChallenge = cfMitigated === "challenge" || /cdn-cgi\/challenge-platform|cloudflare|Just a moment/i.test(body);
  const host = hostFor(tokenUrl);

  if (isCloudflareChallenge) {
    return `${providerName} token exchange was blocked by Cloudflare on ${host}. The browser login succeeded, but the local server-to-server token exchange could not complete. Try again later or use a provider/API-key flow.`;
  }

  if (isHtml) {
    return `${providerName} token exchange returned an HTML error page from ${host}. The OAuth callback was reached, but the provider did not return JSON tokens.`;
  }

  const compact = body.replace(/\s+/g, " ").trim().slice(0, 500);
  return `${providerName} token exchange failed with HTTP ${response.status}${compact ? `: ${compact}` : "."}`;
}

function hostFor(value) {
  try {
    return new URL(value).host;
  } catch {
    return "provider token endpoint";
  }
}

function callbackHtml(success, title, message) {
  const icon = success ? "OK" : "!";
  const color = success ? "#10b981" : "#f97316";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0b0f19; color: #f3f4f6; }
    .card { text-align: center; padding: 2.5rem; background: #111827; border-radius: 12px; border: 1px solid #1f2937; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; width: 100%; }
    .icon { color: ${color}; font-size: 3.5rem; margin-bottom: 1rem; font-weight: 700; }
    h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 600; }
    p { color: #9ca3af; margin: 0; font-size: 0.95rem; }
    .success-line { height: 4px; background: ${color}; border-radius: 2px; width: 60px; margin: 1rem auto; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="success-line"></div>
    <p>${escapeHtml(message)}</p>
  </div>
  <script>
    setTimeout(() => {
      window.close();
    }, 1500);
  </script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char] || char);
}
