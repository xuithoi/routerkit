// RouterKit Web App — State & Mock Data
export const state = {
  view: 'overview',
  accounts: [
    { id: 'a1', provider: 'claude',  name: 'workspace@acme.com',    plan: 'Max 5x',   status: 'active',   tokensUsed: 72000,  tokensLimit: 100000, requests: 341, cost: 12.40, addedAt: '2025-06-01' },
    { id: 'a2', provider: 'gemini',  name: 'dev-team@acme.com',     plan: 'Advanced', status: 'active',   tokensUsed: 48500,  tokensLimit: 150000, requests: 219, cost: 8.20,  addedAt: '2025-06-05' },
    { id: 'a3', provider: 'codex',   name: 'api-prod@acme.com',     plan: 'Team',     status: 'active',   tokensUsed: 95000,  tokensLimit: 100000, requests: 512, cost: 31.80, addedAt: '2025-05-20' },
    { id: 'a4', provider: 'kiro',    name: 'kiro-infra@acme.com',   plan: 'Business', status: 'warning',  tokensUsed: 88000,  tokensLimit: 90000,  requests: 178, cost: 4.60,  addedAt: '2025-06-10' },
    { id: 'a5', provider: 'github',  name: 'copilot-eng@acme.com',  plan: 'Team',     status: 'active',   tokensUsed: 22000,  tokensLimit: 80000,  requests: 94,  cost: 0,     addedAt: '2025-06-12' },
  ],
  logs: [
    { id:'l1', ts:'14:52:09', provider:'claude',  model:'claude-opus-4-5', tokIn:1840, tokOut:320, saved:210, ms:1240, status:200 },
    { id:'l2', ts:'14:51:43', provider:'codex',   model:'gpt-4o',          tokIn:940,  tokOut:180, saved:0,   ms:880,  status:200 },
    { id:'l3', ts:'14:50:21', provider:'gemini',  model:'gemini-1.5-pro',  tokIn:2100, tokOut:440, saved:380, ms:1540, status:200 },
    { id:'l4', ts:'14:49:58', provider:'kiro',    model:'claude-3-7',      tokIn:720,  tokOut:200, saved:120, ms:970,  status:200 },
    { id:'l5', ts:'14:48:34', provider:'codex',   model:'gpt-4o',          tokIn:3200, tokOut:610, saved:0,   ms:2100, status:429 },
    { id:'l6', ts:'14:47:12', provider:'claude',  model:'claude-haiku',    tokIn:580,  tokOut:140, saved:90,  ms:640,  status:200 },
    { id:'l7', ts:'14:46:01', provider:'github',  model:'gpt-4o',          tokIn:1020, tokOut:280, saved:0,   ms:1080, status:200 },
    { id:'l8', ts:'14:44:55', provider:'gemini',  model:'gemini-flash',    tokIn:4100, tokOut:890, saved:540, ms:1820, status:200 },
  ],
  members: [
    { id:'m1', name:'Alex Kim',     email:'alex@acme.com',   role:'Owner',  avatar:'AK', status:'active' },
    { id:'m2', name:'Sara Patel',   email:'sara@acme.com',   role:'Admin',  avatar:'SP', status:'active' },
    { id:'m3', name:'James Wu',     email:'james@acme.com',  role:'Member', avatar:'JW', status:'active' },
    { id:'m4', name:'Nina Torres',  email:'nina@acme.com',   role:'Member', avatar:'NT', status:'pending' },
  ],
};

export const PROVIDERS = {
  claude:  { label:'Claude',          emoji:'✦', color:'#f59e0b', cls:'claude'  },
  codex:   { label:'Codex / ChatGPT', emoji:'◈', color:'#22c55e', cls:'codex'   },
  gemini:  { label:'Gemini',          emoji:'✧', color:'#3b82f6', cls:'gemini'  },
  kiro:    { label:'Kiro AI',         emoji:'◇', color:'#14b8a6', cls:'kiro'    },
  github:  { label:'GitHub Copilot',  emoji:'⬡', color:'#94a3b8', cls:'github'  },
};

export function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n ?? 0);
}

export function pct(used, limit) {
  return limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
}
