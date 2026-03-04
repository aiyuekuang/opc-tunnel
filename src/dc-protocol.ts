// DataChannel message protocol types

export interface DCMessageBase {
  type: string;
  id: string;
}

// --- Chat messages ---

export interface DCChatMessage extends DCMessageBase {
  type: 'chat';
  payload: { content: string };
}

export interface DCChatChunk extends DCMessageBase {
  type: 'chat-chunk';
  payload: { delta: string };
}

export interface DCChatEnd extends DCMessageBase {
  type: 'chat-end';
  payload: Record<string, never>;
}

// --- HTTP proxy messages ---

export interface DCHttpRequest extends DCMessageBase {
  type: 'http-req';
  payload: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: string;
  };
}

export interface DCHttpResHead extends DCMessageBase {
  type: 'http-res-head';
  payload: {
    status: number;
    headers: Record<string, string>;
  };
}

export interface DCHttpResChunk extends DCMessageBase {
  type: 'http-res-chunk';
  payload: { chunk: string }; // base64
}

export interface DCHttpResEnd extends DCMessageBase {
  type: 'http-res-end';
  payload: Record<string, never>;
}

// --- Error ---

export interface DCError extends DCMessageBase {
  type: 'error';
  payload: { message: string };
}

export type DCMessage =
  | DCChatMessage
  | DCChatChunk
  | DCChatEnd
  | DCHttpRequest
  | DCHttpResHead
  | DCHttpResChunk
  | DCHttpResEnd
  | DCError;

export function encodeDC(msg: DCMessage): string {
  return JSON.stringify(msg);
}

export function decodeDC(raw: string): DCMessage {
  return JSON.parse(raw) as DCMessage;
}
