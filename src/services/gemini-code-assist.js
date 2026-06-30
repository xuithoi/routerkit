import { arch, platform } from "node:os";
import { GEMINI_CONFIG } from "../constants.js";
import { openAIToGemini, geminiResponseToOpenAI } from "./translator.js";

export const GEMINI_CODE_ASSIST_PROVIDER = {
  id: "gemini",
  adapter: "gemini-code-assist",
  displayName: "Gemini Code Assist",
  defaultModel: "gemini-2.5-flash",
  baseUrl: "https://cloudcode-pa.googleapis.com/v1internal",
  generatePath: "/v1internal:generateContent",
  streamPath: "/v1internal:streamGenerateContent?alt=sse",
  apiClient: "google-genai-sdk/1.41.0 gl-node",
  scopes: GEMINI_CONFIG.scopes,
};

function nodeArch() {
  const value = arch();
  return value === "ia32" ? "x86" : value;
}

export function geminiCodeAssistUserAgent(model = "unknown") {
  const version = GEMINI_CONFIG.cliVersion || "0.34.0";
  return `GeminiCLI/${version}/${model || "unknown"} (${platform()}; ${nodeArch()}; routerkit)`;
}

export function normalizeGeminiCredentials(tokens = {}) {
  return {
    accessToken: tokens.accessToken || tokens.access_token || tokens.token || "",
    refreshToken: tokens.refreshToken || tokens.refresh_token || "",
    projectId: tokens.projectId || tokens.project_id || tokens.project || "",
    expiresIn: tokens.expiresIn || tokens.expires_in,
    scope: tokens.scope || "",
  };
}

export function buildGeminiCodeAssistPayload(model, requestBody, tokens = {}) {
  const credentials = normalizeGeminiCredentials(tokens);
  const request = requestBody?.contents ? requestBody : openAIToGemini(requestBody);

  return {
    project: credentials.projectId || requestBody?.project || "",
    model,
    request,
  };
}

export function buildGeminiCodeAssistRequestOptions(conn, requestBody) {
  const credentials = normalizeGeminiCredentials(conn.tokens);
  if (!credentials.accessToken) {
    throw new Error("Gemini connection is missing an OAuth access token.");
  }

  const model = requestBody.model || conn.model || GEMINI_CODE_ASSIST_PROVIDER.defaultModel;
  const payload = buildGeminiCodeAssistPayload(model, requestBody, conn.tokens);

  return {
    hostname: "cloudcode-pa.googleapis.com",
    path: GEMINI_CODE_ASSIST_PROVIDER.generatePath,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${credentials.accessToken}`,
      "User-Agent": geminiCodeAssistUserAgent(model),
      "X-Goog-Api-Client": GEMINI_CODE_ASSIST_PROVIDER.apiClient,
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
    model,
  };
}

export function geminiCodeAssistResponseToOpenAI(response, model) {
  const body = response?.response || response;
  return geminiResponseToOpenAI({ ...body, model: body?.model || model }, model);
}

export function getGeminiCapability(connection) {
  const credentials = normalizeGeminiCredentials(connection?.tokens);
  const missing = [];
  if (!credentials.accessToken) missing.push("accessToken");
  if (!credentials.refreshToken) missing.push("refreshToken");
  if (!credentials.projectId) missing.push("projectId");

  return {
    provider: "gemini",
    adapter: GEMINI_CODE_ASSIST_PROVIDER.adapter,
    status: connection?.status || "disconnected",
    ready: missing.length === 0 && connection?.status === "active",
    missing,
    defaultModel: GEMINI_CODE_ASSIST_PROVIDER.defaultModel,
    scopes: GEMINI_CODE_ASSIST_PROVIDER.scopes,
  };
}
