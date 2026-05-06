"use strict";
/**
 * WebFlux worker process — runs on Railway.
 *
 * Responsibilities (stubs; implemented per build sequence):
 *   - Kalshi WebSocket client (Day 3)
 *   - Polymarket REST poller (Day 8)
 *   - Evaluation tick loop at 1Hz per active account (Day 5)
 *   - BullMQ job consumer (Day 5+)
 *   - /health HTTP endpoint for BetterStack uptime monitoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = __importDefault(require("node:http"));
const PORT = process.env.PORT ?? '3001';
const server = node_http_1.default.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', worker: 'webflux-worker', version: '0.1.0' }));
});
server.listen(PORT, () => {
    console.log(`[worker] health endpoint listening on :${PORT}`);
});
process.on('SIGTERM', () => {
    console.log('[worker] SIGTERM received — shutting down');
    server.close(() => process.exit(0));
});
//# sourceMappingURL=index.js.map