/**
 * Main entry point for the Fastify WebSocket API
 * Exports all Lambda handlers for AWS API Gateway WebSocket integration
 */

// Export all handlers
export { handler as connectHandler } from "./handlers/connect";
export { handler as disconnectHandler } from "./handlers/disconnect";
export { handler as messageHandler } from "./handlers/message";
export { handler as defaultHandler } from "./handlers/default";

// Export services
export * from "./services/connection.service";
export * from "./services/message.service";

// Export models
export * from "./models/connection.model";
export * from "./models/message.model";

// Export utilities
export * from "./utils/lambda";
export * from "./utils/fastify";
export * from "./utils/websocket";

// Export config
export * from "./config/config";
