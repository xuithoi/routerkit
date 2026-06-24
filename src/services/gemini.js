import { OAuthService, tokenExchangeErrorMessage } from "./oauth.js";
import { GEMINI_CONFIG } from "../constants.js";

export class GeminiService extends OAuthService {
  constructor() {
    super(GEMINI_CONFIG);
  }

  buildAuthUrl(redirectUri, state) {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: this.config.scopes.join(" "),
      state: state,
      access_type: "offline",
      prompt: "consent",
    });
    return `${this.config.authorizeUrl}?${params.toString()}`;
  }

  async exchangeCode(code, redirectUri) {
    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(await tokenExchangeErrorMessage("Gemini", this.config.tokenUrl, response));
    }

    const tokens = await response.json();
    return tokens;
  }

  async fetchUserInfo(accessToken) {
    const response = await fetch(`${this.config.userInfoUrl}?alt=json`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {};
    }

    return await response.json();
  }

  async fetchProjectId(accessToken) {
    try {
      const response = await fetch(
        "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            metadata: { ideType: 9, platform: 5, pluginType: 2 }, // Standalone defaults to Win
            mode: 1,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.cloudaicompanionProject?.id || data.cloudaicompanionProject || "";
      }
    } catch (e) {
      console.log("Failed to fetch project ID:", e.message);
    }
    return "";
  }

  /**
   * Complete the full browser authentication and token exchange
   */
  async connect() {
    const authResult = await this.authenticate(
      "Gemini CLI",
      this.buildAuthUrl.bind(this)
    );
    const tokens = await this.exchangeCode(
      authResult.code,
      authResult.redirectUri
    );

    const userInfo = await this.fetchUserInfo(tokens.access_token);
    const projectId = await this.fetchProjectId(tokens.access_token);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
      email: userInfo.email,
      projectId: projectId,
    };
  }

  /**
   * Refresh Gemini access token using a refresh token
   */
  async refresh(refreshToken) {
    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(await tokenExchangeErrorMessage("Gemini", this.config.tokenUrl, response));
    }

    const tokens = await response.json();
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken,
      expiresIn: tokens.expires_in,
    };
  }
}
