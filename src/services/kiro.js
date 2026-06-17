import { KIRO_CONFIG } from "../constants.js";
import { fetchKiroProfileArn } from "../helpers.js";

export class KiroService {
  constructor() {
    this.config = KIRO_CONFIG;
  }

  /**
   * Register OIDC client with AWS SSO
   * Returns clientId and clientSecret for device code flow
   */
  async registerClient(region = "us-east-1") {
    const endpoint = `https://oidc.${region}.amazonaws.com/client/register`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientName: this.config.clientName,
        clientType: this.config.clientType,
        scopes: this.config.scopes,
        grantTypes: this.config.grantTypes,
        issuerUrl: this.config.issuerUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kiro OIDC client registration failed: ${error}`);
    }

    const data = await response.json();
    return {
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      clientSecretExpiresAt: data.clientSecretExpiresAt,
    };
  }

  /**
   * Start device authorization for AWS Builder ID or IDC
   */
  async startDeviceAuthorization(clientId, clientSecret, startUrl, region = "us-east-1") {
    const endpoint = `https://oidc.${region}.amazonaws.com/device_authorization`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        startUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start device authorization: ${error}`);
    }

    const data = await response.json();
    return {
      deviceCode: data.deviceCode,
      userCode: data.userCode,
      verificationUri: data.verificationUri,
      verificationUriComplete: data.verificationUriComplete,
      expiresIn: data.expiresIn,
      interval: data.interval || 5,
    };
  }

  /**
   * Poll for token using device code (AWS Builder ID/IDC)
   */
  async pollDeviceToken(clientId, clientSecret, deviceCode, region = "us-east-1") {
    const endpoint = `https://oidc.${region}.amazonaws.com/token`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        deviceCode,
        grantType: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    const data = await response.json();

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
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
        tokenType: data.tokenType,
      },
    };
  }

  /**
   * Complete flow for AWS Builder ID or IDC (blocking poll helper)
   */
  async connectDeviceFlow(options = {}) {
    const region = options.region || "us-east-1";
    const startUrl = options.startUrl || this.config.startUrl;
    const onCodeReceived = options.onCodeReceived || ((deviceData) => {
      console.log(`\nGo to: ${deviceData.verificationUriComplete || deviceData.verificationUri}`);
      console.log(`Enter code: ${deviceData.userCode}\n`);
    });

    // 1. Register OIDC client
    const clientInfo = await this.registerClient(region);

    // 2. Start device flow
    const deviceData = await this.startDeviceAuthorization(
      clientInfo.clientId,
      clientInfo.clientSecret,
      startUrl,
      region
    );

    onCodeReceived(deviceData);

    // 3. Poll for tokens
    const deadline = Date.now() + (deviceData.expiresIn || 300) * 1000;
    const interval = deviceData.interval || 5;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));

      const pollResult = await this.pollDeviceToken(
        clientInfo.clientId,
        clientInfo.clientSecret,
        deviceData.deviceCode,
        region
      );

      if (pollResult.success) {
        const profileArn = await fetchKiroProfileArn(pollResult.tokens.accessToken);
        return {
          ...pollResult.tokens,
          profileArn,
          clientId: clientInfo.clientId,
          clientSecret: clientInfo.clientSecret,
          region,
          startUrl,
          authMethod: options.startUrl ? "idc" : "builder-id",
        };
      }

      if (!pollResult.pending) {
        throw new Error(pollResult.errorDescription || pollResult.error || "Device flow failed");
      }
    }

    throw new Error("Device authorization timed out");
  }

  /**
   * Build Google/GitHub social login URL
   */
  buildSocialLoginUrl(provider, codeChallenge, state) {
    const idp = provider === "google" ? "Google" : "Github";
    const redirectUri = "kiro://kiro.kiroAgent/authenticate-success";
    return `${this.config.authServiceUrl}/login?idp=${idp}&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}&prompt=select_account`;
  }

  /**
   * Exchange authorization code for tokens (Social Login)
   */
  async exchangeSocialCode(code, codeVerifier) {
    const redirectUri = "kiro://kiro.kiroAgent/authenticate-success";

    const response = await fetch(`${this.config.authServiceUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kiro social token exchange failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      profileArn: data.profileArn,
      expiresIn: data.expiresIn || 3600,
    };
  }

  /**
   * Refresh AWS Builder ID/IDC or Social Login token
   */
  async refresh(refreshToken, providerSpecificData = {}) {
    const { clientId, clientSecret, region } = providerSpecificData;

    // AWS Builder ID or IDC refresh
    if (clientId && clientSecret) {
      const endpoint = `https://oidc.${region || "us-east-1"}.amazonaws.com/token`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
          refreshToken,
          grantType: "refresh_token",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Kiro OIDC refresh failed: ${error}`);
      }

      const data = await response.json();
      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || refreshToken,
        profileArn: data.profileArn,
        expiresIn: data.expiresIn,
      };
    }

    // Social Login refresh
    const response = await fetch(`${this.config.authServiceUrl}/refreshToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kiro social refresh failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || refreshToken,
      profileArn: data.profileArn,
      expiresIn: data.expiresIn || 3600,
    };
  }

  /**
   * Validate and import Kiro refresh token manually
   */
  async validateImportToken(refreshToken) {
    if (!refreshToken.startsWith("aorAAAAAG")) {
      throw new Error("Invalid Kiro token format (should start with aorAAAAAG...)");
    }

    try {
      const result = await this.refresh(refreshToken);
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken || refreshToken,
        profileArn: result.profileArn,
        expiresIn: result.expiresIn,
        authMethod: "imported",
      };
    } catch (error) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }
}
