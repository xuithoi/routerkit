/**
 * RouterKit — Main Entry Point
 * Re-exports all services, utilities, and configurations.
 * 
 * Quick start:
 *   import { RouterProxy } from 'routerkit/proxy';
 *   new RouterProxy({ port: 20128 }).start();
 */

// ── Core Proxy & Middleware ──────────────────────────
export { RouterProxy } from "./services/proxy.js";
export { createEmbeddedGateway, inspectEmbeddedGateway, normalizeGatewayConfig, DEFAULT_GATEWAY_CONFIG } from "./services/gateway.js";
export { getGatewayStatus, getConnectionCapability, PROVIDER_CAPABILITIES } from "./services/capabilities.js";

// ── Feature Services ────────────────────────────────
export { rtkCompress, estimateTokens } from "./services/rtk.js";
export { translateRequest, translateResponse, openAIToAnthropic, anthropicToOpenAI, openAIToGemini } from "./services/translator.js";
export { getConnections, getConnection, upsertConnection, updateConnectionTokens, setConnectionStatus, removeConnection, logRequest, getUsageLogs, getUsageStats, getSettings, saveSetting } from "./services/db.js";

// ── OAuth Provider Services ──────────────────────────
export { ClaudeService } from "./services/claude.js";
export { CodexService } from "./services/codex.js";
export { GeminiService } from "./services/gemini.js";
export { GEMINI_CODE_ASSIST_PROVIDER, buildGeminiCodeAssistPayload, buildGeminiCodeAssistRequestOptions, geminiCodeAssistResponseToOpenAI, getGeminiCapability, normalizeGeminiCredentials } from "./services/gemini-code-assist.js";
export { KiroService } from "./services/kiro.js";
export { GithubService } from "./services/github.js";
export { OAuthService } from "./services/oauth.js";

// ── Utilities ────────────────────────────────────────
export { generatePKCE, generateCodeVerifier, generateCodeChallenge, generateState } from "./pkce.js";
export { decodeJwtPayload, extractEmailFromAccessToken, extractCodexAccountInfo, fetchKiroProfileArn } from "./helpers.js";

// ── Provider Configurations ──────────────────────────
export {
  CLAUDE_CONFIG,
  CODEX_CONFIG,
  GEMINI_CONFIG,
  KIRO_CONFIG,
  GITHUB_CONFIG,
  ANTIGRAVITY_CONFIG,
  getOAuthPlatformEnum,
} from "./constants.js";
