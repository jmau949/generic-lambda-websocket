import axios from "axios";
import * as jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import { config } from "../config/config";

// JWKS Cache
interface JwksCache {
  keys: any[];
  timestamp: number;
}

// Global JWKS cache
let jwksCache: JwksCache | null = null;

// Cache TTL - 24 hours in milliseconds
const JWKS_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Fetch and cache JSON Web Key Set (JWKS) from the identity provider
 * @returns The JWKS keys
 */
export async function getJwks(): Promise<any[]> {
  const now = Date.now();

  // Use cached JWKS if available and not expired
  if (jwksCache && now - jwksCache.timestamp < JWKS_CACHE_TTL) {
    return jwksCache.keys;
  }

  try {
    // Construct JWKS URL based on the identity provider
    const jwksUrl = `https://cognito-idp.${config.region}.amazonaws.com/${config.cognito.userPoolId}/.well-known/jwks.json`;

    // Fetch JWKS from the identity provider
    const response = await axios.get(jwksUrl);

    // Update cache
    jwksCache = {
      keys: response.data.keys,
      timestamp: now,
    };

    return jwksCache.keys;
  } catch (error) {
    console.error("Error fetching JWKS:", error);
    throw new Error("Failed to retrieve JWKS");
  }
}

/**
 * Validate a JWT token against the JWKS
 * @param token - The JWT token to validate
 * @returns The verified token payload
 */
export async function validateToken(token: string): Promise<any> {
  if (!token) {
    throw new Error("Token is required");
  }

  try {
    // Decode token header to get the key ID (kid)
    const decodedToken = jwt.decode(token, { complete: true });

    if (
      !decodedToken ||
      typeof decodedToken !== "object" ||
      !decodedToken.header ||
      !decodedToken.header.kid
    ) {
      throw new Error("Invalid token format");
    }

    // Get the key ID from token header
    const keyId = decodedToken.header.kid;

    // Get JWKS and find matching key
    const jwks = await getJwks();
    const matchingKey = jwks.find((key) => key.kid === keyId);

    if (!matchingKey) {
      throw new Error("No matching key found in JWKS");
    }

    // Convert JWK to PEM format
    const pem = jwkToPem(matchingKey);

    // Verify the token with the public key
    const verifiedToken = jwt.verify(token, pem, {
      issuer: `https://cognito-idp.${config.region}.amazonaws.com/${config.cognito.userPoolId}`,
      algorithms: ["RS256"],
    });

    return verifiedToken;
  } catch (error) {
    console.error("Token validation error:", error);
    throw new Error(`Invalid token: ${error.message || "Verification failed"}`);
  }
}

/**
 * Extract authorization token from WebSocket request query parameters or headers
 * @param event - API Gateway WebSocket event
 * @returns The extracted token or null if not found
 */
export function extractTokenFromEvent(event: any): string | null {
  // Check query string parameters - this is the primary method for WebSocket connections
  if (event.queryStringParameters && event.queryStringParameters.token) {
    return event.queryStringParameters.token;
  }

  // Also check raw query string if query parameters weren't parsed
  if (
    event.multiValueQueryStringParameters &&
    event.multiValueQueryStringParameters.token
  ) {
    return event.multiValueQueryStringParameters.token[0];
  }

  // Check for query string in request context for API Gateway v2
  if (
    event.requestContext &&
    event.requestContext.http &&
    event.requestContext.http.path
  ) {
    const url = event.requestContext.http.path;
    const tokenMatch = url.match(/[?&]token=([^&]+)/);
    if (tokenMatch) {
      return decodeURIComponent(tokenMatch[1]);
    }
  }

  // Fallback to header (though unlikely to be available in WebSocket connections)
  if (event.headers && event.headers.Authorization) {
    const authHeader = event.headers.Authorization;
    // Check if it's a Bearer token
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
    return authHeader;
  }

  // Last resort: look for raw query string in the request URL if available
  if (
    event.requestContext &&
    event.requestContext.domainName &&
    event.requestContext.stage
  ) {
    // This is a workaround for situations where query params aren't parsed
    console.log("Checking for raw query string in event context");
  }

  console.log("No token found in event:", JSON.stringify(event, null, 2));
  return null;
}

/**
 * Authenticate a WebSocket connection request
 * @param event - API Gateway WebSocket event
 * @returns Object containing authentication status and user information if successful
 */
export async function authenticateConnection(event: any): Promise<{
  authenticated: boolean;
  user?: any;
  error?: string;
}> {
  try {
    // Extract token from the connection request
    const token = extractTokenFromEvent(event);

    if (!token) {
      return {
        authenticated: false,
        error: "No authentication token provided",
      };
    }

    // Validate the token
    const user = await validateToken(token);

    // Return successful authentication result with user data
    return {
      authenticated: true,
      user,
    };
  } catch (error) {
    console.error("Authentication error:", error);

    // Return failed authentication with error message
    return {
      authenticated: false,
      error: error.message || "Authentication failed",
    };
  }
}
