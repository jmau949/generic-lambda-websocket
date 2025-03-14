export interface WebSocketMessage {
  action: string;
  data?: any;
}

export interface WebSocketResponse {
  message: string;
  data?: any;
}
