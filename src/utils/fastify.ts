// import fastify, { FastifyInstance } from "fastify";
// import { APIGatewayProxyWebsocketEventV2, Context } from "aws-lambda";

// /**
//  * Create and configure a Fastify instance for handling WebSocket messages
//  */
// export const createFastifyInstance = (): FastifyInstance => {
//   const server = fastify({
//     logger: {
//       level: process.env.LOG_LEVEL || "info",
//       serializers: {
//         req(request) {
//           return {
//             method: request.method,
//             url: request.url,
//             headers: request.headers,
//             hostname: request.hostname,
//             remoteAddress: request.ip,
//             remotePort: request.socket ? request.socket.remotePort : undefined,
//           };
//         },
//       },
//     },
//   });

//   // Add global error handler
//   server.setErrorHandler((error, request, reply) => {
//     request.log.error(error);
//     reply.status(500).send({ error: "Internal Server Error" });
//   });

//   return server;
// };

// /**
//  * Function to handle WebSocket requests via Fastify
//  */
// export const handleWebSocketWithFastify = async (
//   server: FastifyInstance,
//   event: APIGatewayProxyWebsocketEventV2,
//   context: Context
// ) => {
//   try {
//     // Register your routes and plugins here

//     // Pass the WebSocket event to the appropriate handler
//     const routeKey = event.requestContext.routeKey;
//     const response = await server.inject({
//       method: "POST",
//       url: `/${routeKey}`,
//       payload: event,
//     });

//     return JSON.parse(response.payload);
//   } catch (error) {
//     console.error("Error handling WebSocket event with Fastify:", error);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ message: "Internal Server Error" }),
//     };
//   }
// };
