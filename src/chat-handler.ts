import { encodeDC } from './dc-protocol.js';
import type { DCChatMessage } from './dc-protocol.js';

/**
 * Handles incoming chat messages by forwarding to OpenClaw's
 * OpenAI-compatible /v1/chat/completions endpoint with SSE streaming.
 * Streams back delta chunks via DataChannel.
 */
export async function handleChat(
  msg: DCChatMessage,
  openclawPort: number,
  sendDC: (data: string) => void,
): Promise<void> {
  const { id, payload } = msg;

  try {
    const res = await fetch(`http://127.0.0.1:${openclawPort}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'default',
        messages: [{ role: 'user', content: payload.content }],
        stream: true,
      }),
    });

    if (!res.ok) {
      sendDC(encodeDC({
        type: 'error',
        id,
        payload: { message: `OpenClaw 返回 ${res.status}` },
      }));
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      sendDC(encodeDC({
        type: 'error',
        id,
        payload: { message: 'OpenClaw 无响应体' },
      }));
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            sendDC(encodeDC({
              type: 'chat-chunk',
              id,
              payload: { delta },
            }));
          }
        } catch {
          // skip malformed SSE data
        }
      }
    }

    sendDC(encodeDC({ type: 'chat-end', id, payload: {} }));
  } catch (err: any) {
    sendDC(encodeDC({
      type: 'error',
      id,
      payload: { message: `OpenClaw 连接失败: ${err.message}` },
    }));
  }
}
