import {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyResult,
} from "aws-lambda";
import { extractConnectionInfo, createResponse } from "../utils/lambda";
import { saveConnection } from "../services/connection.service";
import { authenticateConnection } from "../services/auth.service";

/**
 * Handle WebSocket $connect event
 *
 * Authentication is always required. For WebSocket connections, the token must
 * be provided as a query parameter since cookies and headers are not reliably
 * available in WebSocket API Gateway events.
 */
export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("Connect event:", JSON.stringify(event, null, 2));

    // Extract connection information from the event, including query parameters
    const { connectionId, domainName, stage, queryParams } =
      extractConnectionInfo(event);

    console.log("Extracted connection info:", {
      connectionId,
      domainName,
      stage,
      queryParams,
    });

    // Authenticate the connection
    const authResult = await authenticateConnection(event);

    if (!authResult.authenticated) {
      // Log the authentication failure
      console.log("Authentication failed:", authResult.error);

      // Important: For WebSocket connections, returning a non-200 response
      // will close the connection. This is the correct behavior for auth failures.
      return createResponse(401, {
        message: "Unauthorized",
        error: authResult.error || "Authentication required",
      });
    }

    // Authentication successful
    console.log("Authenticated user:", authResult.user);

    // Save the connection to DynamoDB with user info
    await saveConnection({
      //@ts-ignore
      connectionId,
      domainName,
      stage,
      timestamp: Date.now(),
      userId: authResult.user.sub || authResult.user.username,
      userEmail: authResult.user.email,
      isAuthenticated: true,
    });

    // Return a successful response to allow the connection
    return createResponse(200, { message: "Connected" });
  } catch (error) {
    console.error("Error handling connect event:", error);
    return createResponse(500, { message: "Internal Server Error" });
  }
};
