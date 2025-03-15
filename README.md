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

### Development Options

#### Option 1: Run the Local WebSocket Server (Recommended for Development)

This standalone server runs independently from AWS resources and is ideal for rapid development:

```bash
# Start the local WebSocket server
npm run local
```

The WebSocket server will be available at `ws://localhost:3000`

#### Option 2: Run with SAM Local (For AWS Integration Testing)

If you need to test with the full AWS infrastructure locally:

```bash
# Build the TypeScript project
npm run build

# Start the SAM local API
npm run start
```

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