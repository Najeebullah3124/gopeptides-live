import { Router, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAllTools } from './tools';

const router = Router();

/** Shared secret required on every request to this router. */
function requireMcpApiKey(req: Request, res: Response, next: () => void): void {
  const expected = process.env.MCP_API_KEY;
  if (!expected) {
    res.status(503).json({ error: 'MCP server is not configured (MCP_API_KEY missing).' });
    return;
  }
  const header = req.headers.authorization || '';
  // claude.ai's custom-connector UI has no header field, only a URL — so a `?key=` query
  // param is also accepted, letting the key travel embedded in the connector URL itself.
  const provided =
    (header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined) ||
    (req.headers['x-mcp-api-key'] as string | undefined) ||
    (req.query.key as string | undefined);
  if (!provided || provided !== expected) {
    // req.protocol is unreliable here — the /api/ nginx block doesn't forward
    // X-Forwarded-Proto, and this backend is only ever served over https.
    const base = process.env.MCP_PUBLIC_URL || `https://${req.get('host')}`;
    res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`);
    res.status(401).json({ error: 'Missing or invalid MCP API key. Send it as `Authorization: Bearer <key>`, `x-mcp-api-key` header, or `?key=` query param.' });
    return;
  }
  next();
}

router.use(requireMcpApiKey);
// Mounted after the app's global express.json() middleware — req.body arrives already parsed.

router.post('/', async (req: Request, res: Response) => {
  // Stateless mode: a fresh server + transport per request, closed once the response ends.
  // Simplest and safest pattern for a shared multi-client remote MCP endpoint — no session
  // state to leak between callers or clean up after a crash.
  const server = new McpServer({ name: 'gopeptides-admin', version: '1.0.0' });
  registerAllTools(server);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on('close', () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[mcp] request failed:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

// Stateless mode doesn't use GET (server->client streaming) or DELETE (session termination).
router.get('/', (_req: Request, res: Response) => {
  res.status(405).json({ error: 'Method not allowed — this MCP server is stateless (POST only).' });
});

export default router;
