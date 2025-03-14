export const config = {
  // DynamoDB
  connectionsTable: process.env.CONNECTIONS_TABLE || "ConnectionsTable",

  // Connection TTL in seconds (default: 2 hours)
  connectionTtl: 7200,

  // AWS region
  region: process.env.AWS_REGION || "us-east-1",
};
