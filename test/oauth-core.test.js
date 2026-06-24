import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";
import { CODEX_CONFIG } from "../src/constants.js";
import { OAuthService, tokenExchangeErrorMessage } from "../src/services/oauth.js";
import { CodexService } from "../src/services/codex.js";

test("Codex OAuth uses the current auth.openai.com endpoint and CLI-compatible params", () => {
  const service = new CodexService();
  const authUrl = service.buildAuthUrl("http://localhost:1455/auth/callback", "state", "challenge");
  const url = new URL(authUrl);

  assert.equal(url.origin, "https://auth.openai.com");
  assert.equal(url.pathname, "/oauth/authorize");
  assert.equal(url.searchParams.get("client_id"), CODEX_CONFIG.clientId);
  assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:1455/auth/callback");
  assert.equal(url.searchParams.get("codex_cli_simplified_flow"), "true");
  assert.equal(url.searchParams.get("id_token_add_organizations"), "true");
});

test("token exchange Cloudflare challenge is summarized without raw HTML", async () => {
  const response = new Response("<html><script src=\"/cdn-cgi/challenge-platform/scripts/jsd/main.js\"></script></html>", {
    status: 403,
    headers: {
      "content-type": "text/html",
      "cf-mitigated": "challenge",
    },
  });

  const message = await tokenExchangeErrorMessage("Codex", CODEX_CONFIG.tokenUrl, response);

  assert.match(message, /blocked by Cloudflare/);
  assert.match(message, /server-to-server token exchange/);
  assert.doesNotMatch(message, /<script/);
  assert.doesNotMatch(message, /cdn-cgi\/challenge-platform\/scripts/);
});

test("fixed OAuth callback port conflict fails with actionable message", async () => {
  const occupiedServer = http.createServer((_req, res) => {
    res.writeHead(200);
    res.end("stale");
  });

  await new Promise((resolve) => occupiedServer.listen(0, "127.0.0.1", resolve));
  const { port } = occupiedServer.address();

  try {
    const service = new OAuthService({ fixedPort: port });
    await assert.rejects(
      () => service.startCallbackServer(() => {}, port),
      new RegExp(`OAuth callback port ${port} is already in use`)
    );
  } finally {
    await new Promise((resolve) => occupiedServer.close(resolve));
  }
});
