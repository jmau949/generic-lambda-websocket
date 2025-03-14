import {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyResult,
} from "aws-lambda";
import { extractConnectionInfo, createResponse } from "../utils/lambda";
import { saveConnection } from "../services/connection.service";

/**
 * Handle WebSocket $connect event
 */
export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("Connect event:", JSON.stringify(event));

    // Extract connection information from the event
    const { connectionId, domainName, stage } = extractConnectionInfo(event);

    // Save the connection to DynamoDB
    await saveConnection({
      //@ts-ignore
      connectionId,
      domainName,
      stage,
      timestamp: Date.now(),
    });

    // Return a successful response
    return createResponse(200, { message: "Connected" });
  } catch (error) {
    console.error("Error handling connect event:", error);
    return createResponse(500, { message: "Internal Server Error" });
  }
};
