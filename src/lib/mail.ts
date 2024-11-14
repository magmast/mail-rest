import { createMiddleware } from "hono/factory";
import { ImapFlow } from "imapflow";
import { env } from "~/lib/env";

declare module "hono" {
  interface ContextVariableMap {
    imapClient: ImapFlow;
  }
}

export function decodeMailboxPath(urlEncoded: string) {
  return decodeURIComponent(urlEncoded);
}

export function encodeMailboxPath(path: string) {
  return encodeURIComponent(path);
}

export const imapClient = createMiddleware(async (c, next) => {
  const imapClient = new ImapFlow({
    host: env.IMAP_HOST,
    port: env.IMAP_PORT,
    auth: {
      user: env.IMAP_USER,
      pass: env.IMAP_PASS,
    },
    secure: false,
    tls: {
      rejectUnauthorized: false,
    },
  });

  await imapClient.connect();

  c.set("imapClient", imapClient);

  try {
    await next();
  } finally {
    await imapClient.logout();
  }
});

export function imapLock(mailboxPath: string) {
  return createMiddleware(async (c, next) => {
    const client = c.get("imapClient");
    const lock = await client.getMailboxLock(mailboxPath);
    try {
      await next();
    } finally {
      lock.release();
    }
  });
}
