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
   * Start a local HTTP server on a random (or specified) port to capture the callback
   * @param {Function} onCallback - Called when code redirect hits the server
   * @param {number} [fixedPort=0] - Fixed port to listen on, or 0 for dynamic
   * @returns {Promise<{port: number, close: Function}>}
   */
  startCallbackServer(onCallback, fixedPort = 0) {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const url = new URL(req.url, `http://localhost`);

        if (url.pathname === "/callback" || url.pathname === "/auth/callback") {
          const params = Object.fromEntries(url.searchParams);

          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authentication Successful</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0b0f19; color: #f3f4f6; }
    .card { text-align: center; padding: 2.5rem; background: #111827; border-radius: 12px; border: 1px solid #1f2937; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; width: 100%; }
    .icon { color: #10b981; font-size: 3.5rem; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 600; }
    p { color: #9ca3af; margin: 0; font-size: 0.95rem; }
    .success-line { height: 4px; background: #10b981; border-radius: 2px; width: 60px; margin: 1rem auto; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Authentication Successful</h1>
    <div class="success-line"></div>
    <p>You can close this tab and return to your application.</p>
  </div>
  <script>
    setTimeout(() => {
      window.close();
    }, 1500);
  </script>
</body>
</html>`);

          onCallback(params);
        } else {
          res.writeHead(404);
          res.end("Not found");
        }
      });

      server.listen(fixedPort, "127.0.0.1", () => {
        const { port } = server.address();
        resolve({
          port,
          close: () => server.close(),
        });
      });

      server.on("error", (err) => {
        if (err.code === "EADDRINUSE" && fixedPort) {
          reject(new Error(`Port ${fixedPort} is already in use.`));
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Helper that starts the local server and handles standard web OAuth redirect flow
   * @param {string} providerName - Name of the provider for console printout
   * @param {Function} buildAuthUrlFn - Callback to build URL with port
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

    // Wait for redirect to hit the server
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
