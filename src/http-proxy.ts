import { encodeDC } from './dc-protocol.js';
import type { DCHttpRequest } from './dc-protocol.js';

const CHUNK_SIZE = 16 * 1024; // 16KB chunks for DataChannel

/**
 * Proxies HTTP requests from DataChannel to localhost:PORT.
 * Streams response back in chunks (base64 encoded for binary safety).
 */
export async function handleHttpRequest(
  msg: DCHttpRequest,
  localPort: number,
  sendDC: (data: string) => void,
): Promise<void> {
  const { id, payload } = msg;
  const url = `http://127.0.0.1:${localPort}${payload.path}`;

  try {
    const fetchOptions: RequestInit = {
      method: payload.method,
      headers: payload.headers,
    };

    if (payload.body && payload.method !== 'GET' && payload.method !== 'HEAD') {
      fetchOptions.body = payload.body;
    }

    const res = await fetch(url, fetchOptions);

    // Send response head
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    sendDC(encodeDC({
      type: 'http-res-head',
      id,
      payload: { status: res.status, headers },
    }));

    // Stream response body in chunks
    const reader = res.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Split large chunks
        for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
          const slice = value.slice(offset, offset + CHUNK_SIZE);
          const b64 = Buffer.from(slice).toString('base64');
          sendDC(encodeDC({
            type: 'http-res-chunk',
            id,
            payload: { chunk: b64 },
          }));
        }
      }
    }

    sendDC(encodeDC({ type: 'http-res-end', id, payload: {} }));
  } catch (err: any) {
    sendDC(encodeDC({
      type: 'error',
      id,
      payload: { message: `本地服务请求失败: ${err.message}` },
    }));
  }
}
