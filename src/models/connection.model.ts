export interface Connection {
  connectionId: string;
  timestamp: number;
  domainName?: string;
  stage?: string;
  userId?: string;
  ttl?: number;
}
