/**
 * Local WebSocket Server for Development
 *
 * This server replicates an AWS API Gateway WebSocket setup for local development.
 * It allows testing WebSocket interactions without deploying to AWS.
 *
 * Key Features:
 * - Uses Fastify to serve an HTTP API.
 * - Implements WebSocket connections for bidirectional communication.
 * - Simulates AWS DynamoDB with an in-memory store.
 * - Calls the same Lambda function handlers as in production.
 */

import fastify, { FastifyInstance } from "fastify";
import WebSocket, { Server as WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// In-memory stores for connections
const connections = new Map<string, any>();
const sockets = new Map<string, WebSocket>();

// Create Fastify instance
const app: FastifyInstance = fastify({
  logger: {
    level: "info",
  },
});

/**
 * Set up AWS mocks before importing the handlers
 * This prevents the actual AWS SDK calls from being made
 */

// Mock AWS SDK modules using Node.js module system
// This approach avoids Jest dependency
const originalRequire = module.require;
// @ts-ignore
module.require = function (id: string) {
  // Mock DynamoDB Client
  if (id === "@aws-sdk/client-dynamodb") {
    return {
      DynamoDBClient: class MockDynamoDBClient {
        send() {
          return Promise.resolve({});
        }
      },
    };
  }

  // Mock DynamoDB Document Client
  if (id === "@aws-sdk/lib-dynamodb") {
    const PutCommandClass = class PutCommand {
      input: any;
      constructor(input: any) {
        this.input = input;
      }
    };

    const GetCommandClass = class GetCommand {
      input: any;
      constructor(input: any) {
        this.input = input;
      }
    };

    const DeleteCommandClass = class DeleteCommand {
      input: any;
      constructor(input: any) {
        this.input = input;
      }
    };

    return {
      DynamoDBDocumentClient: {
        from: () => ({
          send: async (command: any) => {
            if (command instanceof PutCommandClass) {
              const item = command.input.Item;
              connections.set(item.connectionId, item);
              return {};
            } else if (command instanceof GetCommandClass) {
              const connectionId = command.input.Key.connectionId;
              return { Item: connections.get(connectionId) || null };
            } else if (command instanceof DeleteCommandClass) {
              const connectionId = command.input.Key.connectionId;
              connections.delete(connectionId);
              return {};
            }
            return {};
          },
        }),
      },
      PutCommand: PutCommandClass,
      GetCommand: GetCommandClass,
      DeleteCommand: DeleteCommandClass,
    };
  }

  // Mock ApiGatewayManagementApi Client
  if (id === "@aws-sdk/client-apigatewaymanagementapi") {
    return {
      ApiGatewayManagementApiClient: class MockApiGatewayManagementApiClient {
        constructor() {}

        async send(command: any) {
          if (command.input && command.input.ConnectionId) {
            const connectionId = command.input.ConnectionId;
            const data = command.input.Data;
            const socket = sockets.get(connectionId);

            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(data.toString());
            } else {
              console.log(`Connection ${connectionId} is gone or closed`);
              connections.delete(connectionId);
              sockets.delete(connectionId);
              throw new Error("GoneException");
            }
          }
          return {};
        }
      },
      PostToConnectionCommand: class PostToConnectionCommand {
        input: any;
        constructor(input: any) {
          this.input = input;
        }
      },
    };
  }

  // For all other modules, use the original require
  return originalRequire.apply(this, [id]);
};

// Set environment variables before importing handlers
process.env.CONNECTIONS_TABLE = "local-connections-table";
process.env.AWS_REGION = "us-east-1";

// Now import the handlers (after mocking AWS SDK)
async function importHandlers() {
  // Import all handlers from the index file
  const handlersModule = await import("./src/handlers/index");

  return {
    connectHandler: handlersModule.connect,
    disconnectHandler: handlersModule.disconnect,
    messageHandler: handlersModule.message,
    defaultHandler: handlersModule.default,
  };
}

/**
 * Creates a mock API Gateway WebSocket event object.
 * This is required because AWS API Gateway WebSockets use a specific event format.
 *
 * @param type - The event type (`$connect`, `$disconnect`, or a custom action).
 * @param connectionId - The unique WebSocket connection ID.
 * @param body - (Optional) The message body.
 * @returns A simulated API Gateway event object.
 */
function createApiGatewayEvent(
  type: string,
  connectionId: string,
  body?: string
): any {
  return {
    requestContext: {
      connectionId,
      routeKey: type,
      domainName: "localhost",
      stage: "local",
      identity: {
        sourceIp: "127.0.0.1",
      },
      requestTimeEpoch: Date.now(),
    },
    isBase64Encoded: false,
    body,
  };
}

// Start the server
const start = async () => {
  try {
    // Import the handlers
    const handlers = await importHandlers();

    // Create WebSocket server
    const wss = new WebSocketServer({ noServer: true });

    // Handle WebSocket connections
    wss.on("connection", async (ws: WebSocket, connectionId: string) => {
      console.log(`New WebSocket connection: ${connectionId}`);

      // Store WebSocket instance
      sockets.set(connectionId, ws);

      try {
        // Simulate an AWS API Gateway `$connect` event
        const connectEvent = createApiGatewayEvent("$connect", connectionId);

        // Call the actual WebSocket connect handler
        await handlers.connectHandler(connectEvent);

        // Handle incoming WebSocket messages
        ws.on("message", async (data: WebSocket.Data) => {
          try {
            const messageData = data.toString();
            console.log(`Received message from ${connectionId}:`, messageData);

            // Parse message as JSON (fallback to `$default` action if parsing fails)
            let parsedMessage;
            try {
              parsedMessage = JSON.parse(messageData);
            } catch (error) {
              parsedMessage = { action: "$default" };
            }

            // Convert to API Gateway event format
            const messageEvent = createApiGatewayEvent(
              parsedMessage.action || "$default",
              connectionId,
              messageData
            );

            // Route message to appropriate handler
            if (parsedMessage.action === "message") {
              await handlers.messageHandler(messageEvent);
            } else {
              await handlers.defaultHandler(messageEvent);
            }
          } catch (error) {
            console.error("Error processing message:", error);
            ws.send(
              JSON.stringify({
                error: "Failed to process message",
                message: "Invalid request",
              })
            );
          }
        });

        // Handle WebSocket disconnection
        ws.on("close", async () => {
          console.log(`Connection closed: ${connectionId}`);

          // Simulate AWS API Gateway `$disconnect` event
          const disconnectEvent = createApiGatewayEvent(
            "$disconnect",
            connectionId
          );

          // Call the actual WebSocket disconnect handler
          await handlers.disconnectHandler(disconnectEvent);

          // Cleanup connection
          sockets.delete(connectionId);
        });

        // Send a welcome message to the connected client
        ws.send(
          JSON.stringify({
            message: "Connected to WebSocket server",
            connectionId,
          })
        );
      } catch (error) {
        console.error("Error handling WebSocket connection:", error);
        ws.close();
      }
    });

    // HTTP route for health check
    app.get("/", (request, reply) => {
      reply.send({
        message: "WebSocket server is running",
        activeConnections: connections.size,
      });
    });

    // Start HTTP server
    const server = await app.listen({ port: 3000, host: "0.0.0.0" });
    console.log(`Server is running at ${server}`);

    // Handle WebSocket upgrade
    app.server?.on("upgrade", (request, socket, head) => {
      const connectionId = uuidv4();

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, connectionId);
      });
    });

    console.log(`WebSocket server is running at ws://localhost:3000`);
    console.log(`Using application code from src/ directory`);
    console.log(`Data is stored in-memory (simulating DynamoDB)`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Start the server
start();