import { Router, Request, Response } from 'express';
import crypto from 'crypto';

// Minimal OAuth 2.1 + Dynamic Client Registration wrapper around the static MCP_API_KEY.
// This is a single-admin server (one key, one operator) — there is no real user login,
// so /oauth/authorize auto-approves instantly instead of showing a consent screen.
// It exists only so OAuth-only MCP clients (e.g. claude.ai's connector UI) can complete
// their required sign-in handshake; the issued access_token is just MCP_API_KEY itself.

const router = Router();

function issuer(req: Request): string {
  // This backend is only ever served over https in production — hardcode the scheme
  // rather than trust req.protocol (unreliable behind nginx blocks missing X-Forwarded-Proto).
  return process.env.MCP_PUBLIC_URL || `https://${req.get('host')}`;
}

type PendingAuth = {
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  createdAt: number;
};
const pendingCodes = new Map<string, PendingAuth>();
const CODE_TTL_MS = 5 * 60 * 1000;

function cleanupExpired(): void {
  const now = Date.now();
  for (const [code, data] of pendingCodes) {
    if (now - data.createdAt > CODE_TTL_MS) pendingCodes.delete(code);
  }
}

router.get('/.well-known/oauth-protected-resource', (req: Request, res: Response) => {
  const base = issuer(req);
  res.json({
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
  });
});

router.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
  const base = issuer(req);
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  });
});

router.post('/oauth/register', (req: Request, res: Response) => {
  const redirectUris = Array.isArray(req.body?.redirect_uris) ? req.body.redirect_uris : [];
  res.status(201).json({
    client_id: crypto.randomBytes(16).toString('hex'),
    client_name: req.body?.client_name || 'MCP Client',
    redirect_uris: redirectUris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  });
});

router.get('/oauth/authorize', (req: Request, res: Response) => {
  cleanupExpired();
  const redirectUri = req.query.redirect_uri as string | undefined;
  const codeChallenge = req.query.code_challenge as string | undefined;
  const codeChallengeMethod = (req.query.code_challenge_method as string | undefined) || 'S256';
  const state = req.query.state as string | undefined;
  if (!redirectUri || !codeChallenge) {
    res.status(400).send('Missing redirect_uri or code_challenge');
    return;
  }
  const code = crypto.randomBytes(24).toString('hex');
  pendingCodes.set(code, { redirectUri, codeChallenge, codeChallengeMethod, createdAt: Date.now() });
  const redirect = new URL(redirectUri);
  redirect.searchParams.set('code', code);
  if (state) redirect.searchParams.set('state', state);
  res.redirect(redirect.toString());
});

router.post('/oauth/token', (req: Request, res: Response) => {
  cleanupExpired();
  const expected = process.env.MCP_API_KEY;
  if (!expected) {
    res.status(503).json({ error: 'server_error', error_description: 'MCP_API_KEY missing' });
    return;
  }
  const grantType = req.body?.grant_type;
  if (grantType === 'refresh_token') {
    res.json({ access_token: expected, token_type: 'Bearer', expires_in: 3600, refresh_token: expected });
    return;
  }
  if (grantType !== 'authorization_code') {
    res.status(400).json({ error: 'unsupported_grant_type' });
    return;
  }
  const code = req.body?.code as string | undefined;
  const codeVerifier = req.body?.code_verifier as string | undefined;
  const pending = code ? pendingCodes.get(code) : undefined;
  if (!pending) {
    res.status(400).json({ error: 'invalid_grant', error_description: 'Unknown or expired code' });
    return;
  }
  pendingCodes.delete(code as string);
  if (pending.codeChallengeMethod === 'S256') {
    const verifierHash = crypto.createHash('sha256').update(codeVerifier || '').digest('base64url');
    if (verifierHash !== pending.codeChallenge) {
      res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
      return;
    }
  }
  res.json({ access_token: expected, token_type: 'Bearer', expires_in: 3600, refresh_token: expected });
});

export default router;
