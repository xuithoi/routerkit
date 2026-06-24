import { platform, arch } from "os";

function getOAuthPlatformEnum() {
  const os = platform();
  const architecture = arch();
  if (os === "darwin") return architecture === "arm64" ? 2 : 1;
  if (os === "linux") return architecture === "arm64" ? 4 : 3;
  if (os === "win32") return 5;
  return 0;
}

export const OAUTH_TIMEOUT = 300000; // 5 minutes

export const CLAUDE_CONFIG = {
  clientId: "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
  authorizeUrl: "https://claude.ai/oauth/authorize",
  tokenUrl: "https://api.anthropic.com/v1/oauth/token",
  scopes: ["org:create_api_key", "user:profile", "user:inference"],
  codeChallengeMethod: "S256",
};

export const CODEX_CONFIG = {
  clientId: process.env.ROUTERKIT_OPENAI_CLIENT_ID || "app_EMoamEEZ73f0CkXaXp7hrann",
  authorizeUrl: "https://auth.openai.com/oauth/authorize",
  tokenUrl: "https://auth.openai.com/oauth/token",
  scope: "openid profile email offline_access",
  fixedPort: 1455,
  callbackPath: "/auth/callback",
  codeChallengeMethod: "S256",
  extraParams: {
    prompt: "login",
    id_token_add_organizations: "true",
    codex_cli_simplified_flow: "true",
    originator: "routerkit",
  },
};

export const GEMINI_CONFIG = {
  clientId: "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com",
  clientSecret: "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",
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: ["https://www.googleapis.com/auth/cloud-platform", "openid", "email"],
  userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
};

export const KIRO_CONFIG = {
  clientName: "kiro-cli-client",
  clientType: "public",
  scopes: ["codewhisperer:conversations", "codewhisperer:analysis"],
  grantTypes: ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"],
  issuerUrl: "https://oidc.us-east-1.amazonaws.com",
  startUrl: "https://portal.awsapps.com/start",
  loginUrl: "https://prod.us-east-1.auth.desktop.kiro.dev/login",
  authServiceUrl: "https://prod.us-east-1.auth.desktop.kiro.dev",
};

export const GITHUB_CONFIG = {
  clientId: "Iv1.b507a0c1074e0d99",
  deviceCodeUrl: "https://github.com/login/device/code",
  tokenUrl: "https://github.com/login/oauth/access_token",
  copilotTokenUrl: "https://api.github.com/copilot_internal/v2/token",
  userInfoUrl: "https://api.github.com/user",
  scopes: "read:user",
  apiVersion: "2022-11-28",
  userAgent: "GitHubCopilotChat/1.0.0",
};

export const ANTIGRAVITY_CONFIG = {
  clientId: "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com",
  clientSecret: "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",
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: ["https://www.googleapis.com/auth/cloud-platform", "openid", "email"],
  userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
  loadCodeAssistEndpoint: "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist",
  onboardUserEndpoint: "https://cloudcode-pa.googleapis.com/v1internal:onboardUser",
  loadCodeAssistUserAgent: "google-api-nodejs-client/9.15.1",
  loadCodeAssistApiClient: "google-cloud-sdk vscode_cloudshelleditor/0.1",
  loadCodeAssistClientMetadata: JSON.stringify({ ideType: 9, platform: getOAuthPlatformEnum(), pluginType: 2 }),
};
