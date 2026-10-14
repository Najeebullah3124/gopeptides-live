import { env } from '../config/env';
import { signAccessToken } from '../utils/jwt';

const MCP_SERVICE_USER_ID = process.env.MCP_SERVICE_USER_ID || '';
const MCP_SERVICE_EMAIL = 'mcp-service@gopeptides.nl';

if (!MCP_SERVICE_USER_ID) {
  // eslint-disable-next-line no-console
  console.warn('[mcp] MCP_SERVICE_USER_ID is not set — admin-authenticated tool calls will fail.');
}

const BASE_URL = `http://127.0.0.1:${env.port}`;

/** Mint a fresh short-lived admin access token for the dedicated MCP service account. */
function mintServiceToken(): string {
  return signAccessToken({ sub: MCP_SERVICE_USER_ID, email: MCP_SERVICE_EMAIL, role: 'ADMIN' });
}

export class AdminApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`Admin API request failed with status ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * Calls the backend's own REST API in-process (loopback HTTP), authenticated as the
 * dedicated MCP service admin account. Reuses all existing validation, business logic,
 * and side effects (cache invalidation, audit logs, etc.) already built into the
 * controllers instead of duplicating it here.
 */
export async function adminRequest<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  opts: { body?: unknown; query?: Record<string, string | number | boolean | undefined> } = {},
): Promise<T> {
  const url = new URL(BASE_URL + path);
  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${mintServiceToken()}`,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    // leave as raw text (e.g. robots.txt, sitemap xml)
  }

  if (!res.ok) {
    throw new AdminApiError(res.status, parsed);
  }
  return parsed as T;
}
