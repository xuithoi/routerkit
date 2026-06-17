import { OAuthService } from "./oauth.js";
import { CODEX_CONFIG } from "../constants.js";
import { extractCodexAccountInfo } from "../helpers.js";

export class CodexService extends OAuthService {
  constructor() {
    super(CODEX_CONFIG);
  }

  buildAuthUrl(redirectUri, state, codeChallenge) {
    const params = {
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: this.config.scope,
      code_challenge: codeChallenge,
      code_challenge_method: this.config.codeChallengeMethod,
      ...this.config.extraParams,
      state: state,
    };
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    return `${this.config.authorizeUrl}?${queryString}`;
  }

  async exchangeCode(code, redirectUri, codeVerifier) {
    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.config.clientId,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Codex token exchange failed: ${error}`);
    }

    const tokens = await response.json();
    const accountInfo = extractCodexAccountInfo(tokens.id_token);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      expiresIn: tokens.expires_in,
      email: accountInfo.email,
      chatgptAccountId: accountInfo.chatgptAccountId,
      chatgptPlanType: accountInfo.chatgptPlanType,
    };
  }

  /**
   * Complete the full browser authentication and token exchange
   */
  async connect() {
    const authResult = await this.authenticate(
      "Codex",
      this.buildAuthUrl.bind(this)
    );
    return await this.exchangeCode(
      authResult.code,
      authResult.redirectUri,
      authResult.codeVerifier
    );
  }

  /**
   * Refresh an expired access token using a refresh token
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
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Codex token refresh failed: ${error}`);
    }

    const tokens = await response.json();
    const accountInfo = extractCodexAccountInfo(tokens.id_token);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken,
      idToken: tokens.id_token,
      expiresIn: tokens.expires_in,
      email: accountInfo.email,
      chatgptAccountId: accountInfo.chatgptAccountId,
      chatgptPlanType: accountInfo.chatgptPlanType,
    };
  }
}
