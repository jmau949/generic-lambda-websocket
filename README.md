# LLM WebSocket API

A WebSocket API built with AWS API Gateway, Lambda, DynamoDB, and Fastify to stream LLM results to users.

## Architecture

This application uses:
- **AWS API Gateway (WebSocket)**: Manages WebSocket connections
- **AWS Lambda**: Process connection events and messages
- **Amazon DynamoDB**: Store WebSocket connection IDs
- **Fastify**: Fast, low-overhead web framework
- **AWS SAM**: For local development and deployment

## Project Structure

```
llm-websocket-api/
├── src/
│   ├── handlers/       # Lambda handlers
│   ├── services/       # Business logic
│   ├── repositories/   # Data access
│   ├── utils/          # Helper functions
│   ├── config/         # Configuration
│   └── app.js          # Application setup
├── tests/              # Tests
└── template.yaml       # SAM template
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [AWS CLI](https://aws.amazon.com/cli/)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- [Docker](https://www.docker.com/) (for local testing)

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```

### Local Development

1. Start the local API:
   ```
   npm run start:local
   ```
   This will start API Gateway locally on port 3000.

2. Connect to the WebSocket using a client:
   ```
   wss://localhost:3000/dev
   ```

### Deployment

1. Build the application:
   ```
   npm run build
   ```

2. Deploy to AWS (first time):
   ```
   npm run deploy
   ```
   This will guide you through the deployment process.

3. For subsequent deployments:
   ```
   npm run deploy:ci
   ```

## WebSocket API

### Connection

Connect to the WebSocket endpoint.

### Routes

- `message`: Send a message to get LLM processing
  ```json
  {
    "action": "message",
    "data": {
      "prompt": "Your message here"
    }
  }
  ```

## License

MIT