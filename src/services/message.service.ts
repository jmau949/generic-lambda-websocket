import { WebSocketMessage, WebSocketResponse } from "../models/message.model";
import { getConnection } from "./connection.service";
import {
  createApiGatewayClient,
  sendMessageToClient,
  getWebSocketEndpoint,
} from "../utils/websocket";

/**
 * Handle incoming WebSocket message
 */
export const handleMessage = async (
  message: WebSocketMessage,
  connectionId: string,
  domainName: string,
  stage: string
): Promise<WebSocketResponse> => {
  try {
    // Get connection details from DynamoDB
    const connection = await getConnection(connectionId);

    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // Process the message (in a real implementation, this would trigger LLM processing)
    // For now, just echo back "Hello World"
    const response: WebSocketResponse = {
      message: "Hello World",
    };

    // Send response back to the client
    const endpoint = getWebSocketEndpoint(domainName, stage);
    const apiGatewayClient = createApiGatewayClient(endpoint);
    await sendMessageToClient(apiGatewayClient, connectionId, response);

    return response;
  } catch (error) {
    console.error("Error handling message:", error);
    throw error;
  }
};
