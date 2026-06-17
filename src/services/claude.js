import { OAuthService } from "./oauth.js";
import { CLAUDE_CONFIG } from "../constants.js";

export class ClaudeService extends OAuthService {
  constructor() {
    super(CLAUDE_CONFIG);
  }

  buildAuthUrl(redirectUri, state, codeChallenge) {
    const params = new URLSearchParams({
      code: "true",
      client_id: this.config.clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: this.config.scopes.join(" "),
      code_challenge: codeChallenge,
      code_challenge_method: this.config.codeChallengeMethod,
      state: state,
    });
    return `${this.config.authorizeUrl}?${params.toString()}`;
  }

  async exchangeCode(code, redirectUri, codeVerifier, state) {
    let authCode = code;
    let codeState = "";
    if (authCode.includes("#")) {
      const parts = authCode.split("#");
      authCode = parts[0];
      codeState = parts[1] || "";
    }

    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        code: authCode,
        state: codeState || state,
        grant_type: "authorization_code",
        client_id: this.config.clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude token exchange failed: ${error}`);
    }

    const tokens = await response.json();
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
    };
  }

  /**
   * Complete the full browser authentication and token exchange
   * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: number, scope: string}>}
   */
  async connect() {
    const authResult = await this.authenticate(
      "Claude",
      this.buildAuthUrl.bind(this)
    );
    return await this.exchangeCode(
      authResult.code,
      authResult.redirectUri,
      authResult.codeVerifier,
      authResult.state
    );
  }

  /**
   * Refresh an expired access token using a refresh token
   * @param {string} refreshToken 
   * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: number}>}
   */
  async refresh(refreshToken) {
    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: this.config.clientId,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude token refresh failed: ${error}`);
    }

    const tokens = await response.json();
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken,
      expiresIn: tokens.expires_in,
    };
  }
}
