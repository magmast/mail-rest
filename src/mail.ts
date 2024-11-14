import { createMiddleware } from "hono/factory";
import { ImapFlow } from "imapflow";
import "~/auth";

declare module "hono" {
  interface ContextVariableMap {
    imapClient: ImapFlow;
  }
}

export const imapClient = createMiddleware(async (c, next) => {
  const account = c.get("account");

  const imapClient = new ImapFlow({
    host: account.host,
    port: account.port,
    auth: {
      user: account.username,
      pass: account.password,
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
