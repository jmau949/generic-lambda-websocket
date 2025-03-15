# Fastify WebSocket API for AWS API Gateway

A TypeScript implementation of a WebSocket server using Fastify, AWS API Gateway, Lambda, and DynamoDB for managing connections and streaming LLM responses.

## Project Structure

```
fastify-websocket-api/
├── src/
│   ├── handlers/       # Lambda handlers for WebSocket events
│   ├── services/       # Business logic services
│   ├── utils/          # Utility functions
│   ├── models/         # Data models
│   └── config/         # Configuration
├── tests/              # Test files
├── local-server.ts     # Standalone local WebSocket server
├── test-client.html    # Browser-based test client
└── template.yaml       # SAM template for AWS deployment
```

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

## Development Workflow

### Local Development Server

The project includes a local development server (`local-server.ts`) that:

1. **Uses your actual application code** from the `src/` directory
2. **Mocks AWS services** (DynamoDB, API Gateway) in memory
3. **Simulates the AWS WebSocket API Gateway** environment

This means you can develop and test your code locally using the same codebase that will be deployed to AWS. You don't need to maintain separate code for local development and production.

```bash
# Start the local development server
npm run local
```

When you run the local server:
- It imports and uses your handlers from `src/handlers/`
- All database operations are redirected to an in-memory store
- WebSocket messages are properly routed to your handler functions
- You can see logs and debug your application code directly

The local server acts as a bridge between your browser and your Lambda handlers, simulating the role of API Gateway.


### Testing

1. Open `test-client.html` in your browser
2. Connect to the appropriate WebSocket endpoint:
   - Local server: `ws://localhost:3000`
   - SAM local: Check the terminal output for the WebSocket URL
3. Send test messages to verify functionality

## Deployment to AWS

1. Update `samconfig.toml` with your AWS settings

2. Deploy to AWS:
```bash
npm run deploy
```

3. After deployment, note the WebSocket URL from the CloudFormation outputs

## Implementing LLM Streaming

To implement LLM streaming, you'll need to modify the following:

1. Update `message.service.ts` to:
   - Process user input
   - Call your LLM service
   - Stream results back through the WebSocket

2. Consider adding authentication to secure your endpoints.

## Troubleshooting

### Common Issues with SAM Local

The SAM CLI sometimes has difficulty properly emulating WebSocket APIs locally. If you encounter issues:

1. Use the standalone local server (`npm run local`) for development
2. Ensure your template.yaml has the proper WebSocket configuration
3. Check AWS SAM CLI version compatibility

### Connection Issues

If clients cannot connect:
- Verify CORS settings if connecting from a browser
- Check network/firewall settings
- Verify the WebSocket URL format (ws:// for local, wss:// for deployed)

## License

ISC