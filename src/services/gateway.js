import { RouterProxy } from "./proxy.js";
import { getGatewayStatus } from "./capabilities.js";

export const DEFAULT_GATEWAY_CONFIG = {
  host: "127.0.0.1",
  port: 20128,
  publicBaseUrl: null,
  rtk: true,
};

export function normalizeGatewayConfig(options = {}) {
  const port = options.port === undefined || options.port === null
    ? DEFAULT_GATEWAY_CONFIG.port
    : Number(options.port);

  return {
    ...DEFAULT_GATEWAY_CONFIG,
    ...options,
    port,
  };
}

export function createEmbeddedGateway(options = {}) {
  return new RouterProxy(normalizeGatewayConfig(options));
}

export function inspectEmbeddedGateway(options = {}) {
  return getGatewayStatus(normalizeGatewayConfig(options));
}
