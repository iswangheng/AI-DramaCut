// ============================================
// WebSocket 模块统一导出
// ============================================

// 导出服务器端
export { wsServer } from './server';
export type { WSMessage, WSMessageHandler, WSMessageType } from './server';

// 导出客户端
export { WSClient, getWSClient, closeWSClient, useWS } from './client';
export type { WSClientConfig } from './client';
