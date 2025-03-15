import fastify from "fastify";
import WebSocket, { Server, MessageEvent } from "ws"; // Correct way to import WebSocket and WebSocket server

import { v4 as uuidv4 } from "uuid";

// In-memory connection store (for local development)
const connections = new Map<string, WebSocket>();

// Create Fastify instance
const app = fastify({
  logger: {
    level: "info",
  },
});

// Setup WebSocket server
const wss = new (WebSocket as any).Server({ noServer: true });

wss.on("connection", (ws: WebSocket, connectionId: string) => {
  console.log(`New connection: ${connectionId}`);

  // Store connection
  connections.set(connectionId, ws);

  // Handle messages
  ws.addEventListener("message", (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data as string);
      console.log(`Received message from ${connectionId}:`, message);

      // Handle based on action type
      if (message.action === "message") {
        // Echo back "Hello World"
        const response = {
          message: "Hello World",
          data: message.data,
        };

        ws.send(JSON.stringify(response));
      } else {
        // Default handler
        const response = {
          message: "Unknown action type. Please send a valid action.",
          receivedAction: message.action || "undefined",
        };

        ws.send(JSON.stringify(response));
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({
          error: "Error processing message",
          message: "Invalid message format",
        })
      );
    }
  });

  // Handle connection close
  ws.addEventListener("close", () => {
    console.log(`Connection closed: ${connectionId}`);
    connections.delete(connectionId);
  });

  // Send welcome message
  ws.send(
    JSON.stringify({
      message: "Connected to WebSocket server",
      connectionId,
    })
  );
});

// HTTP routes
app.get("/", (request, reply) => {
  reply.send({ message: "WebSocket server is running" });
});

// Start the server
const start = async () => {
  try {
    const server = await app.listen({ port: 3000, host: "0.0.0.0" });
    console.log(`Server is running at ${server}`);

    // Handle WebSocket upgrade
    app.server?.on("upgrade", (request, socket, head) => {
      const connectionId = uuidv4();

      wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        wss.emit("connection", ws, connectionId);
      });
    });

    console.log("WebSocket server is running at ws://localhost:3000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
