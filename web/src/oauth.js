/**
 * RouterKit — oauth.js
 * Real browser-side OAuth flows for all providers.
 * - PKCE popup flow: Claude, Gemini
 * - PKCE with fixed port notice: Codex (port 1455)
 * - Device code flow: GitHub Copilot
 * - Portal redirect: Kiro (AWS SSO)
 */

// ─────────────────────────────────────────────
// PKCE Crypto Helpers (Web Crypto API)
// ─────────────────────────────────────────────

async function generateVerifier() {
  const buf = new Uint8Array(48);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateChallenge(verifier) {
  const encoded = new TextEncoder().encode(verifier);
  const digest  = await crypto.subtle.digest('SHA-256', encoded);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generateState() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, b => b.toString(16).padStart(2,'0')).join('');
}

// ─────────────────────────────────────────────
// Provider Configurations (real client IDs from SDK)
// ─────────────────────────────────────────────

const OAUTH_CONFIGS = {
  claude: {
    type: 'pkce_popup',
    clientId: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
    authorizeUrl: 'https://claude.ai/oauth/authorize',
    tokenUrl: 'https://api.anthropic.com/v1/oauth/token',
    scopes: 'org:create_api_key user:profile user:inference',
  },
  gemini: {
    type: 'pkce_popup',
    clientId: '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com',
    clientSecret: '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',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: 'https://www.googleapis.com/auth/cloud-platform openid email',
    extraParams: { access_type: 'offline', prompt: 'consent' },
  },
  codex: {
    // OpenAI's OAuth requires redirect to localhost:1455 specifically (desktop client)
    // We open the URL but the user must run the RouterKit CLI for token capture
    type: 'pkce_popup',
    clientId: '859fb0a2-282e-407f-8e2b-f73c51ef62ec',
    authorizeUrl: 'https://auth0.openai.com/authorize',
    tokenUrl: 'https://auth0.openai.com/oauth/token',
    scopes: 'openid profile email offline_access',
    extraParams: { audience: 'https://api.openai.com/v1', prompt: 'login' },
    // Codex uses a fixed port 1455 for redirect — we try with our origin
    fixedRedirectUri: 'http://localhost:1455/auth/callback',
    note: 'OpenAI requires redirect to port 1455. Start the RouterKit CLI (`npm run dev` in the SDK folder) to capture the token.',
  },
  github: {
    type: 'device',
    clientId: 'Iv1.b507a0c1074e0d99',
    deviceCodeUrl: 'https://github.com/login/device/code',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: 'read:user',
  },
  kiro: {
    type: 'portal',
    loginUrl: 'https://prod.us-east-1.auth.desktop.kiro.dev/login',
    startUrl: 'https://portal.awsapps.com/start',
    note: 'Kiro uses AWS SSO. The browser will open the AWS portal. After login, use the RouterKit CLI to complete device pairing.',
  },
};

// ─────────────────────────────────────────────
// PKCE Popup Flow
// ─────────────────────────────────────────────

async function pkcePopup(provider, config, onUpdate) {
  const verifier   = await generateVerifier();
  const challenge  = await generateChallenge(verifier);
  const stateParam = generateState();

  const redirectUri = config.fixedRedirectUri || `${window.location.origin}/callback.html`;

  // Persist verifier for token exchange after popup
  sessionStorage.setItem('rk_verifier',  verifier);
  sessionStorage.setItem('rk_state',     stateParam);
  sessionStorage.setItem('rk_provider',  provider);
  sessionStorage.setItem('rk_redirect',  redirectUri);

  const params = new URLSearchParams({
    client_id:             config.clientId,
    redirect_uri:          redirectUri,
    response_type:         'code',
    scope:                 config.scopes,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    state:                 stateParam,
    ...(config.extraParams || {}),
  });

  const authUrl = `${config.authorizeUrl}?${params}`;

  onUpdate('browser', `Opening ${provider} login…`, authUrl);

  // Try popup first
  const popup = window.open(authUrl, `rk_oauth_${provider}`, 'width=580,height=660,scrollbars=yes,resizable=yes');

  if (!popup) {
    // Popup blocked → full page redirect
    window.location.href = authUrl;
    return null;
  }

  // Wait for postMessage callback from callback.html
  // NOTE: We do NOT poll window.closed here because COOP headers on provider sites
  // (claude.ai, google.com) block access to popup.closed from a cross-origin opener.
  // We rely solely on postMessage from our /callback.html page.
  return new Promise((resolve, reject) => {
    const TIMEOUT = 5 * 60 * 1000; // 5 min

    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener('message', onMsg);
    }

    function onMsg(event) {
      if (event.origin !== window.location.origin) return;
      const d = event.data;
      if (!d || d.type !== 'rk_oauth') return;
      cleanup();
      if (d.error) return reject(new Error(d.error_description || d.error));
      resolve({ code: d.code, state: d.state });
    }

    const timer = setTimeout(() => {
      cleanup();
      // Don't auto-reject on timeout if popup might still be open — user may need more time
      // Instead reject with a friendly message
      reject(new Error('Authentication timed out. Please complete login within 5 minutes and try again.'));
    }, TIMEOUT);

    window.addEventListener('message', onMsg);
  });

}

// ─────────────────────────────────────────────
// Token Exchange (PKCE — no client_secret for public clients)
// ─────────────────────────────────────────────

async function exchangeCodeForToken(config, code, verifier, redirectUri) {
  const body = {
    grant_type:    'authorization_code',
    client_id:     config.clientId,
    code,
    redirect_uri:  redirectUri,
    code_verifier: verifier,
  };
  if (config.clientSecret) body.client_secret = config.clientSecret;

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data;
}

// ─────────────────────────────────────────────
// GitHub Device Flow
// ─────────────────────────────────────────────

async function githubDeviceFlow(config, onUpdate) {
  // Request device code via a CORS proxy since GitHub blocks direct browser requests
  // We'll construct the URL and open GitHub directly with instructions
  const deviceUrl = `${config.deviceCodeUrl}?client_id=${config.clientId}&scope=${encodeURIComponent(config.scopes)}`;

  // Fetch device code (GitHub supports CORS for this endpoint in some configs)
  let deviceData;
  try {
    const res = await fetch(config.deviceCodeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ client_id: config.clientId, scope: config.scopes }),
    });
    deviceData = await res.json();
  } catch (err) {
    // CORS blocked — fall back to manual instructions
    onUpdate('device_manual', 'GitHub Device Flow', {
      verification_uri: 'https://github.com/login/device',
      user_code: '(Open GitHub to get your code)',
      note: 'GitHub device flow requires CORS support. Open the URL manually and enter the code shown.',
    });
    return null;
  }

  if (deviceData.error) throw new Error(deviceData.error_description || deviceData.error);

  const { user_code, verification_uri, device_code, interval = 5, expires_in = 900 } = deviceData;

  onUpdate('device_code', 'Enter this code on GitHub', { user_code, verification_uri });

  // Open GitHub in new tab
  window.open(verification_uri, '_blank');

  // Poll for token
  return new Promise((resolve, reject) => {
    const maxTime = Date.now() + expires_in * 1000;
    const poll = setInterval(async () => {
      if (Date.now() > maxTime) {
        clearInterval(poll);
        return reject(new Error('Device code expired.'));
      }
      try {
        const res = await fetch(config.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: new URLSearchParams({
            client_id: config.clientId,
            device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
        });
        const data = await res.json();
        if (data.access_token) {
          clearInterval(poll);
          resolve(data);
        }
        // authorization_pending → keep polling
      } catch { /* keep polling */ }
    }, interval * 1000);
  });
}

// ─────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────

/**
 * Connect a provider. Calls onUpdate(phase, title, detail) at each step.
 * Returns token data on success, or null if flow was deferred.
 *
 * Phases:
 *   'browser'      — opened popup, detail = authUrl
 *   'exchange'     — exchanging code for token
 *   'device_code'  — device flow code shown, detail = { user_code, verification_uri }
 *   'device_manual'— manual device flow
 *   'portal'       — portal redirect opened
 *   'done'         — completed, detail = { provider, email, tokens }
 *   'error'        — failed, detail = errorMessage
 */
export async function connectProvider(provider, onUpdate) {
  const config = OAUTH_CONFIGS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  try {
    // ── PKCE popup ──────────────────────────────
    if (config.type === 'pkce_popup') {
      // Special case: Codex uses a fixed port — open URL but inform user
      if (config.fixedRedirectUri) {
        onUpdate('browser', `Opening ${provider} login…`,
          `Note: ${config.note}`);
        const verifier   = await generateVerifier();
        const challenge  = await generateChallenge(verifier);
        const stateParam = generateState();
        sessionStorage.setItem('rk_verifier', verifier);
        sessionStorage.setItem('rk_state',    stateParam);
        sessionStorage.setItem('rk_provider', provider);
        sessionStorage.setItem('rk_redirect', config.fixedRedirectUri);

        const params = new URLSearchParams({
          client_id: config.clientId,
          redirect_uri: config.fixedRedirectUri,
          response_type: 'code', scope: config.scopes,
          code_challenge: challenge, code_challenge_method: 'S256',
          state: stateParam,
          ...(config.extraParams || {}),
        });
        window.open(`${config.authorizeUrl}?${params}`, '_blank');
        // Can't intercept callback at port 1455 from here
        return { deferred: true, note: config.note };
      }

      const result = await pkcePopup(provider, config, onUpdate);
      if (!result) return null; // redirected

      onUpdate('exchange', 'Completing sign-in…', null);

      const verifier    = sessionStorage.getItem('rk_verifier');
      const redirectUri = sessionStorage.getItem('rk_redirect');
      const tokens      = await exchangeCodeForToken(config, result.code, verifier, redirectUri);

      // Fetch user profile if available
      let email = `${provider}-account`;
      if (provider === 'gemini' && tokens.access_token) {
        try {
          const profile = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          }).then(r => r.json());
          email = profile.email || email;
        } catch {}
      }

      onUpdate('done', 'Connected!', { provider, email, tokens });
      return { provider, email, tokens };
    }

    // ── GitHub Device Flow ───────────────────────
    if (config.type === 'device') {
      return await githubDeviceFlow(config, onUpdate);
    }

    // ── Portal/SSO Redirect ──────────────────────
    if (config.type === 'portal') {
      onUpdate('portal', 'Opening AWS SSO portal…', config.note);
      window.open(config.loginUrl, '_blank');
      return { deferred: true, note: config.note };
    }

  } catch (err) {
    onUpdate('error', 'Authentication failed', err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────
// Handle Redirect Callback (when popup was blocked → full redirect)
// ─────────────────────────────────────────────

export function checkRedirectCallback() {
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('code');
  const state  = params.get('state');
  if (!code) return null;

  // Clean URL
  window.history.replaceState({}, '', window.location.pathname);

  return {
    code,
    state,
    verifier:    sessionStorage.getItem('rk_verifier'),
    provider:    sessionStorage.getItem('rk_provider'),
    redirectUri: sessionStorage.getItem('rk_redirect'),
  };
}
