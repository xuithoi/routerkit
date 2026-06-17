import { GITHUB_CONFIG } from "../constants.js";

export class GithubService {
  constructor() {
    this.config = GITHUB_CONFIG;
  }

  async requestDeviceCode() {
    const response = await fetch(this.config.deviceCodeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        scope: this.config.scopes,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub device code request failed: ${error}`);
    }

    return await response.json();
  }

  async pollToken(deviceCode) {
    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text();
      data = { error: "invalid_response", error_description: text };
    }

    if (!response.ok || data.error) {
      return {
        success: false,
        error: data.error,
        errorDescription: data.error_description,
        pending: data.error === "authorization_pending" || data.error === "slow_down",
      };
    }

    return {
      success: true,
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      },
    };
  }

  async fetchCopilotToken(accessToken) {
    const response = await fetch(this.config.copilotTokenUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "X-GitHub-Api-Version": this.config.apiVersion,
        "User-Agent": this.config.userAgent,
      },
    });

    if (!response.ok) return null;
    return await response.json();
  }

  async fetchUserInfo(accessToken) {
    const response = await fetch(this.config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "X-GitHub-Api-Version": this.config.apiVersion,
        "User-Agent": this.config.userAgent,
      },
    });

    if (!response.ok) return null;
    return await response.json();
  }

  /**
   * Complete the full browser authentication and token exchange
   */
  async connect(options = {}) {
    const onCodeReceived = options.onCodeReceived || ((deviceData) => {
      console.log(`\nGo to: ${deviceData.verification_uri || "https://github.com/login/device"}`);
      console.log(`Enter code: ${deviceData.user_code}\n`);
    });

    // 1. Request device code
    const deviceData = await this.requestDeviceCode();

    onCodeReceived(deviceData);

    // 2. Poll for tokens
    const deadline = Date.now() + (deviceData.expires_in || 900) * 1000;
    const interval = deviceData.interval || 5;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));

      const pollResult = await this.pollToken(deviceData.device_code);

      if (pollResult.success) {
        // 3. Post-exchange: get Copilot token and user info
        const copilotToken = await this.fetchCopilotToken(pollResult.tokens.accessToken);
        const userInfo = await this.fetchUserInfo(pollResult.tokens.accessToken);

        return {
          accessToken: pollResult.tokens.accessToken,
          refreshToken: pollResult.tokens.refreshToken,
          expiresIn: pollResult.tokens.expiresIn,
          copilotToken: copilotToken?.token,
          copilotTokenExpiresAt: copilotToken?.expires_at,
          githubUserId: userInfo?.id,
          githubLogin: userInfo?.login,
          githubName: userInfo?.name,
          githubEmail: userInfo?.email,
        };
      }

      if (!pollResult.pending) {
        throw new Error(pollResult.errorDescription || pollResult.error || "GitHub authentication failed");
      }
    }

    throw new Error("GitHub authentication timed out");
  }
}
