#!/usr/bin/env node
/**
 * RouterKit — CLI Entry Point
 * Usage: node bin/cli.js [--port 20128] [--no-rtk]
 */

import { RouterProxy } from '../src/services/proxy.js';
import { getConnections } from '../src/services/db.js';
import open from 'open';

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const port = portIdx !== -1 ? parseInt(args[portIdx + 1]) : 20128;
const hostIdx = args.indexOf('--host');
const host = hostIdx !== -1 ? args[hostIdx + 1] : undefined;
const publicBaseUrlIdx = args.indexOf('--public-base-url');
const publicBaseUrl = publicBaseUrlIdx !== -1 ? args[publicBaseUrlIdx + 1] : undefined;
const rtkEnabled = !args.includes('--no-rtk');

const proxy = new RouterProxy({ port, host, publicBaseUrl, rtk: rtkEnabled });
proxy.start();

// Open dashboard after a short delay
setTimeout(async () => {
  const connections = getConnections();
  const dashUrl = proxy.baseUrl || `http://localhost:${port}/`;
  console.log(`\n  🌐 Opening dashboard: ${dashUrl}\n`);
  try {
    await open(dashUrl);
  } catch {
    // Ignore if browser fails to open
  }
}, 800);

process.on('SIGINT', () => {
  console.log('\n  Shutting down RouterKit...');
  proxy.stop();
  process.exit(0);
});
