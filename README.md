# RouterKit 🚀

**AI Proxy Gateway SDK** — drop-in middleware for routing AI requests across multiple providers with RTK token compression, format translation, multi-account management, analytics, and a premium embedded dashboard.

---

## Features

| Feature | Description |
|---|---|
| 📊 **Real-Time Quota Tracking** | Live dashboard showing token usage, latency, and request counts per provider |
| ⭐ **RTK Token Saver** | Auto-compresses git diffs, grep output, file listings to save tokens before sending to AI |
| 🔄 **Format Translation** | Bidirectional OpenAI ↔ Anthropic ↔ Gemini request/response translation |
| 👥 **Multi-Account Support** | Connect Claude, Codex, Gemini, Kiro, and GitHub Copilot simultaneously |
| 🔄 **Auto Token Refresh** | Automatically refreshes OAuth tokens in the background |
| 📝 **Request Logging** | Full log of every request with tokens, latency, model, and status |
| 📊 **Usage Analytics** | 7-day histogram, per-provider breakdown, and token savings chart |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start the proxy + open dashboard
npm run dev
```

Then visit: **http://localhost:20128/**

---

## Embedded Dashboard

The proxy automatically serves a premium glassmorphism dashboard at `/`:

- **Analytics Tab** — live stats cards + Chart.js visualizations
- **Connections Tab** — manage all connected AI accounts
- **Logs Tab** — real-time filterable request log table
- **Settings Tab** — RTK toggle, routing strategy, auto-refresh

---

## Proxy Endpoint

Once running, point **any OpenAI-compatible client** at RouterKit:

```js
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:20128/v1',
  apiKey: 'routerkit',  // ignored — uses OAuth tokens
});

const response = await client.chat.completions.create({
  model: 'claude-opus-4-5',  // or gemini-1.5-pro, gpt-4o, etc.
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

RouterKit will:
1. **Compress** the request with RTK (saves tokens)
2. **Translate** the format to the target provider
3. **Route** to the best available account
4. **Log** the request and return an OpenAI-compatible response

---

## SDK Usage (embed in your own project)

```js
import { RouterProxy } from './src/services/proxy.js';
import { ClaudeService } from './src/services/claude.js';
import { upsertConnection } from './src/services/db.js';

// 1. Login with Claude OAuth
const claude = new ClaudeService();
const { token, profile } = await claude.login();
upsertConnection('claude', profile, token);

// 2. Start the proxy
new RouterProxy({ port: 20128, rtk: true }).start();
```

---

## CLI Options

```
node bin/cli.js [--port <port>] [--no-rtk]
```

| Flag | Default | Description |
|---|---|---|
| `--port` | 20128 | Port to listen on |
| `--no-rtk` | off | Disable RTK compression |

---

## Supported Providers

| Provider | Auth Method | API Type |
|---|---|---|
| **Claude** (Anthropic) | OAuth PKCE | Anthropic Messages API |
| **Codex / ChatGPT** (OpenAI) | OAuth PKCE (port 1455) | OpenAI Chat API |
| **Gemini** (Google) | OAuth PKCE | Gemini generateContent API |
| **Kiro AI** (AWS) | AWS SSO / OIDC Device Code | CodeWhisperer API |
| **GitHub Copilot** | Device Flow | Copilot Chat API |

---

## Data Storage

All credentials and logs are stored locally in:

```
~/.routerkit/db.json
```

No data is ever sent to any external server.

---

## License

MIT
