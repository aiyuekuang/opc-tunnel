// Public API for programmatic usage
export { setup } from './setup.js';
export { decodeToken, encodeToken, isTokenExpired } from './token.js';
export { detectPlatform, isCloudflaredInstalled, getCloudflaredVersion } from './detect.js';
export { verifyTunnel } from './api.js';
export type { TunnelToken } from './token.js';
export type { Platform } from './detect.js';
