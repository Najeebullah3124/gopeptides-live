import './config/env';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { env } from './config/env';

async function start(): Promise<void> {
  await connectDatabase();
  await connectRedis();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] GoPeptides API listening on http://localhost:${env.port}`);
    console.log(`[server] env=${env.nodeEnv} client=${env.clientUrl}`);
  });

  // If the port is already taken (e.g. a lingering watcher child on Windows),
  // exit immediately instead of staying alive as a zombie. This keeps tsx
  // watch restarts clean rather than piling up failed processes.
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[server] port ${env.port} in use, exiting so the watcher can retry`);
      process.exit(1);
    }
    throw err;
  });

  const shutdown = async (signal: string) => {
    console.log(`[server] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectRedis();
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    console.error('[server] unhandledRejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[server] uncaughtException:', err);
  });
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
