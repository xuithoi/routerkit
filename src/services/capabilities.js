import { getConnections } from "./db.js";
import { getGeminiCapability } from "./gemini-code-assist.js";

export const PROVIDER_CAPABILITIES = {
  claude: {
    provider: "claude",
    adapter: "anthropic-oauth",
    chatCompletions: true,
    streaming: false,
  },
  codex: {
    provider: "codex",
    adapter: "openai-oauth",
    chatCompletions: true,
    streaming: false,
  },
  gemini: {
    provider: "gemini",
    adapter: "gemini-code-assist",
    chatCompletions: true,
    streaming: false,
  },
  kiro: {
    provider: "kiro",
    adapter: "aws-codewhisperer",
    chatCompletions: false,
    streaming: false,
  },
  github: {
    provider: "github",
    adapter: "github-copilot",
    chatCompletions: true,
    streaming: false,
  },
};

export function getConnectionCapability(connection) {
  if (!connection) return null;
  if (connection.provider === "gemini") {
    return {
      ...PROVIDER_CAPABILITIES.gemini,
      ...getGeminiCapability(connection),
    };
  }

  const base = PROVIDER_CAPABILITIES[connection.provider] || {
    provider: connection.provider,
    adapter: "unknown",
    chatCompletions: false,
    streaming: false,
  };

  return {
    ...base,
    status: connection.status,
    ready: connection.status === "active",
    missing: [],
  };
}

export function getGatewayStatus(options = {}) {
  const connections = options.connections || getConnections();
  const capabilities = connections.map(getConnectionCapability).filter(Boolean);
  const active = capabilities.filter((cap) => cap.ready);

  return {
    mode: "embedded",
    host: options.host || null,
    port: options.port || null,
    publicBaseUrl: options.publicBaseUrl || null,
    ready: active.length > 0,
    providers: capabilities,
  };
}
