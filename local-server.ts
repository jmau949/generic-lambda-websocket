/**
 * Local WebSocket Server for Development
 *
 * This server provides a local development environment that mirrors 
 * the AWS API Gateway WebSocket + Lambda + DynamoDB setup but runs entirely locally.
 */

import fastify from "fastify";
import WebSocket, { Server as WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";

// Create Fastify instance
const app = fastify({
  logger: {
    level: "info",
  },
});

// In-memory connection storage
const connections = new Map<string, any>();
const sockets = new Map<string, WebSocket>();

// Configure environment before importing any AWS SDK modules
process.env.AWS_REGION = 'us-east-1';
process.env.CONNECTIONS_TABLE = 'local-connections-table';
process.env.LOCAL_DEVELOPMENT = 'true';

// Import the WebSocket handlers
import { handler as connectHandler } from './src/handlers/connect';
import { handler as disconnectHandler } from './src/handlers/disconnect';
import { handler as messageHandler } from './src/handlers/message';
import { handler as defaultHandler } from './src/handlers/default';

// Create WebSocket server
const wss = new (WebSocket as any).Server({ noServer: true });

/**
 * Creates a mock API Gateway WebSocket event
 */
function createApiGatewayEvent(routeKey: string, connectionId: string, body?: string): any {
  return {
    requestContext: {
      connectionId,
      routeKey,
      domainName: 'localhost',
      stage: 'local',
      identity: {
        sourceIp: '127.0.0.1',
      },
      requestTimeEpoch: Date.now(),
    },
    isBase64Encoded: false,
    body,
  };
}

// Override AWS SDK functions with local implementations
// This needs to be defined after importing the AWS SDK
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

// Create a proxy for DynamoDB client
const originalDynamoDbClient = DynamoDBClient.prototype.send;
DynamoDBClient.prototype.send = async function(command) {
  console.log('Mock DynamoDB command:', command.constructor.name);
  return {};
};

// Create proxies for DynamoDB document client operations
const originalDocClientSend = DynamoDBDocumentClient.prototype.send;
DynamoDBDocumentClient.prototype.send = async function(command) {
  console.log('Mock DynamoDB Document command:', command.constructor.name);
  
  if (command instanceof PutCommand) {
    const item = command.input.Item;
    connections.set(item?.connectionId, item);
    console.log(`Saved connection: ${item?.connectionId}`);
    return {};
  }
  
  if (command instanceof GetCommand) {
    const connectionId = command.input.Key?.connectionId;
    const connection = connections.get(connectionId);
    console.log(`Retrieved connection: ${connectionId}`, connection ? 'Found' : 'Not found');
    return { Item: connection };
  }
  
  if (command instanceof DeleteCommand) {
    const connectionId = command.input.Key?.connectionId;
    connections.delete(connectionId);
    console.log(`Deleted connection: ${connectionId}`);
    return {};
  }
  
  return {};
};

// Create a proxy for API Gateway Management API
const originalApiGatewayClientSend = ApiGatewayManagementApiClient.prototype.send;
ApiGatewayManagementApiClient.prototype.send = async function(command) {
  if (command instanceof PostToConnectionCommand) {
    const connectionId = command.input.ConnectionId;
    const data = command.input.Data;
    const socket = sockets.get(connectionId as any);
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log(`Sending message to connection: ${connectionId}`);
      //@ts-ignore
      socket.send(Buffer.isBuffer(data) ? data.toString() : data);
    } else {
      console.log(`Connection not found or closed: ${connectionId}`);
      throw { name: 'GoneException' };
    }
  }
  
  return {};
};

// Handle WebSocket connections
wss.on('connection', async (ws: WebSocket, connectionId: string) => {
  console.log(`New WebSocket connection: ${connectionId}`);
  
  // Store WebSocket instance
  sockets.set(connectionId, ws);
  
  try {
    // Handle $connect event
    const connectEvent = createApiGatewayEvent('$connect', connectionId);
    await connectHandler(connectEvent);
    
    // Handle incoming messages
    ws.addEventListener('message', async (event) => {
      try {
        const messageData = event.data as string;
        console.log(`Received message from ${connectionId}:`, messageData);
        
        // Parse the message
        let parsedMessage;
        try {
          parsedMessage = JSON.parse(messageData);
        } catch (error) {
          parsedMessage = { action: '$default' };
        }
        
        // Create the API Gateway event
        const messageEvent = createApiGatewayEvent(
          parsedMessage.action || '$default',
          connectionId,
          messageData
        );
        
        // Route to the appropriate handler
        if (parsedMessage.action === 'message') {
          await messageHandler(messageEvent);
        } else {
          await defaultHandler(messageEvent);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          error: 'Error processing message',
          message: 'Failed to process your request'
        }));
      }
    });
    
    // Handle disconnection
    ws.addEventListener('close', async () => {
      console.log(`Connection closed: ${connectionId}`);
      
      // Call disconnect handler
      const disconnectEvent = createApiGatewayEvent('$disconnect', connectionId);
      await disconnectHandler(disconnectEvent);
      
      // Clean up
      sockets.delete(connectionId);
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      message: 'Connected to WebSocket server',
      connectionId
    }));
  } catch (error) {
    console.error('Error handling connection:', error);
    ws.close();
  }
});

// HTTP routes
app.get('/', (request, reply) => {
  reply.send({
    message: 'WebSocket server is running',
    activeConnections: connections.size
  });
});

// Start the server
const start = async () => {
  try {
    const server = await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`Server is running at ${server}`);
    
    // Handle WebSocket upgrade
    app.server?.on('upgrade', (request, socket, head) => {
      const connectionId = uuidv4();
      
      wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        wss.emit('connection', ws, connectionId);
      });
    });
    
    console.log(`WebSocket server is running at ws://localhost:3000`);
    console.log(`Using actual handlers from src/ directory`);
    console.log(`DynamoDB operations redirected to in-memory storage`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Start the server
start();