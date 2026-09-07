// Small stateless Streamable HTTP binding for a private, pre-authorized service.
// Protocol: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
import { timingSafeEqual } from 'node:crypto';

export function authorizeBearer(request, expectedToken) {
  if (typeof expectedToken !== 'string' || expectedToken.length < 32) throw new Error('service_not_configured');
  const header = request.headers.get('authorization') ?? '';
  const actual = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
  const expected = Buffer.from(expectedToken);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function jsonResponse(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...extra,
  } });
}

export async function readBoundedJson(request, maximum = 16 * 1024) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('json_required');
  if (Number(request.headers.get('content-length') ?? 0) > maximum) throw new Error('request_too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('missing_request_body');
  const parts = [];
  let count = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      count += value.byteLength;
      if (count > maximum) throw new Error('request_too_large');
      parts.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(parts)));
}

export async function handleMcp(request, { name, tools, call }) {
  if (request.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
  const version = request.headers.get('mcp-protocol-version');
  if (version && version !== '2025-06-18') return jsonResponse({ error: 'unsupported_protocol_version' }, 400);
  const accept = request.headers.get('accept') ?? '';
  if (!accept.includes('application/json') || !accept.includes('text/event-stream')) return jsonResponse({ error: 'mcp_accept_required' }, 406);
  let message;
  try { message = await readBoundedJson(request); }
  catch { return jsonResponse({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON request' } }, 400); }
  if (!message || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' ||
    (Object.hasOwn(message, 'id') && typeof message.id !== 'string' && !Number.isSafeInteger(message.id))) {
    return jsonResponse({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request' } }, 400);
  }
  if (!Object.hasOwn(message, 'id')) {
    if (['notifications/initialized', 'notifications/cancelled'].includes(message.method)) return new Response(null, { status: 202 });
    return jsonResponse({ error: 'unsupported_notification' }, 400);
  }
  const reply = result => jsonResponse({ jsonrpc: '2.0', id: message.id, result });
  const error = (code, description) => jsonResponse({ jsonrpc: '2.0', id: message.id, error: { code, message: description } });
  if (message.method === 'initialize') return reply({
    protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name, version: '1.0.0' },
    instructions: 'Tool results authenticate declared evidence. They do not establish factual correctness or complete source coverage.',
  });
  if (message.method === 'ping') return reply({});
  if (message.method === 'tools/list') return reply({ tools });
  if (message.method !== 'tools/call') return error(-32601, 'Method not found');
  if (!tools.some(t => t.name === message.params?.name)) return error(-32602, 'Unknown tool');
  try {
    const wrapper = await call(message.params.name, message.params.arguments ?? {});
    return reply({ structuredContent: wrapper, content: [{ type: 'text', text: JSON.stringify(wrapper) }], isError: false });
  } catch (failure) {
    const code = /^[a-z][a-z0-9_]{1,80}$/.test(failure?.message) ? failure.message : 'provenance_operation_failed';
    return reply({ content: [{ type: 'text', text: code }], isError: true });
  }
}
