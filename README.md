# Fastify WebSocket API for AWS API Gateway

A TypeScript implementation of a WebSocket server using Fastify, AWS API Gateway, Lambda, and DynamoDB for managing connections and streaming LLM responses.

## Architecture

This project implements a serverless WebSocket API using the following AWS services:

1. **API Gateway WebSocket API**: Manages WebSocket connections with clients
2. **Lambda Functions**: Process WebSocket events and business logic
3. **DynamoDB**: Stores active connection information

![Architecture Diagram](https://via.placeholder.com/800x400?text=WebSocket+API+Architecture)

## Project Structure

```
fastify-websocket-api/
├── src/
│   ├── handlers/         # Lambda handlers for WebSocket events
│   │   ├── connect.ts    # Handles $connect event
│   │   ├── disconnect.ts # Handles $disconnect event
│   │   ├── message.ts    # Handles message events
│   │   ├── default.ts    # Handles unknown events
│   │   └── index.ts      # Exports all handlers
│   ├── services/         # Business logic services
│   │   ├── connection.service.ts # Connection management
│   │   └── message.service.ts    # Message processing
│   ├── utils/            # Utility functions
│   │   ├── lambda.ts     # Lambda helper functions
│   │   ├── fastify.ts    # Fastify configuration
│   │   └── websocket.ts  # WebSocket utilities
│   ├── models/           # Data models
│   │   ├── connection.model.ts # Connection data structure
│   │   └── message.model.ts    # Message data structure
│   ├── config/           # Configuration
│   │   └── config.ts     # Application configuration
│   └── index.ts          # Main entry point
├── tests/                # Test files
├── local-server.ts       # Standalone local WebSocket server
├── test-client.html      # Browser-based test client
├── template.yaml         # SAM template for AWS deployment
└── tsconfig.json         # TypeScript configuration
```

## Flow Explanation

### 1. Connection Lifecycle

1. **Connection Establishment**:
   - Client initiates a WebSocket connection to API Gateway
   - API Gateway triggers the `$connect` Lambda function
   - `connect.ts` handler validates the connection and stores connection details in DynamoDB
   - Connection ID is returned to the client

2. **Message Exchange**:
   - Client sends a message with an `action` field
   - API Gateway routes the message based on the action
   - Corresponding Lambda function processes the message
   - For `message` action: `message.ts` handler processes the request
   - For unknown actions: `default.ts` handler is invoked
   - Responses are sent back through API Gateway to the client

3. **Disconnection**:
   - Client closes the connection
   - API Gateway triggers the `$disconnect` Lambda function
   - `disconnect.ts` handler removes the connection from DynamoDB

### 2. LLM Integration (To Be Implemented)

When receiving a message, the flow will be:
1. Client sends message with user input
2. Message handler processes the request
3. LLM service is called to generate a response
4. Response is streamed back to the client through the WebSocket connection

### 3. Data Flow

```
Client <--> API Gateway <--> Lambda <--> DynamoDB
                                 |
                                 v
                            LLM Service
```

## AWS Resources Created

The `template.yaml` file defines the following AWS resources:

1. **API Gateway WebSocket API**: `WebSocketApi`
   - Manages WebSocket connections and routes
   - Routes: `$connect`, `$disconnect`, `message`, `$default`

2. **Lambda Functions**:
   - `ConnectFunction`: Handles new connections
   - `DisconnectFunction`: Handles disconnections
   - `MessageFunction`: Processes messages
   - `DefaultFunction`: Handles unknown message types

3. **DynamoDB Table**: `ConnectionsTable`
   - Stores connection information with TTL
   - Schema: `connectionId` (primary key), `timestamp`, `ttl`

4. **IAM Permissions**:
   - DynamoDB access for all functions
   - API Gateway Management API access for message/default functions

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Local Development

#### Run the Local WebSocket Server

This server runs locally and simulates the AWS infrastructure:

```bash
# Start the local WebSocket server
npm run local
```

The WebSocket server will be available at `ws://localhost:3000`

Key features of the local server:
- Uses the same handlers as the AWS deployment
- Simulates DynamoDB with in-memory storage
- Provides the same API Gateway event format
- No AWS resources required for development

#### Local Testing

1. Open `test-client.html` in your browser
2. Connect to `ws://localhost:3000`
3. Send test messages to verify functionality

### AWS Deployment

1. Update `samconfig.toml` with your AWS settings

2. Build the project:
```bash
npm run build
```

3. Deploy to AWS:
```bash
npm run deploy
```

4. After deployment, note the WebSocket URL from the CloudFormation outputs

## Implementation Details

### 1. Connection Management

Connections are stored in DynamoDB with the following attributes:
- `connectionId`: Unique identifier from API Gateway (Primary Key)
- `timestamp`: Connection creation time
- `ttl`: Time-to-live for automatic cleanup
- `domainName`: API Gateway domain
- `stage`: API Gateway stage

### 2. WebSocket Communication

The `websocket.ts` utility provides:
- `createApiGatewayClient`: Creates a management API client
- `sendMessageToClient`: Sends messages to connected clients
- `getWebSocketEndpoint`: Generates endpoint URLs

### 3. Request/Response Handling

The `lambda.ts` utility provides:
- `createResponse`: Creates standard API Gateway responses
- `parseWebSocketEvent`: Parses incoming WebSocket messages
- `extractConnectionInfo`: Gets connection details from events

## Adding LLM Streaming

To implement LLM streaming, modify `src/services/message.service.ts`:

1. Process the user's message from the WebSocket event
2. Call your LLM service (OpenAI, Anthropic, etc.)
3. Stream tokens back to the client using `sendMessageToClient`

Example flow:
```typescript
// In message.service.ts
const response = await callLlmService(message.data);
const apiGatewayClient = createApiGatewayClient(endpoint);

// Stream chunks back to the client
for (const chunk of response.stream) {
  await sendMessageToClient(apiGatewayClient, connectionId, {
    type: 'chunk',
    content: chunk
  });
}

// Send completion message
await sendMessageToClient(apiGatewayClient, connectionId, {
  type: 'done'
});
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Errors**:
   - Check CORS settings in API Gateway
   - Verify SSL configuration for wss:// connections
   - Ensure IAM permissions are correct

2. **Lambda Execution Issues**:
   - Check CloudWatch logs for errors
   - Verify environment variables are set correctly
   - Ensure DynamoDB table exists and is accessible

3. **Local Server Issues**:
   - If AWS SDK errors occur, the mocking may need adjustment
   - Check that all dependencies are installed
   - Verify port 3000 is available

## License

ISC