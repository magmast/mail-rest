import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import PostalMime from "postal-mime";
import { authorized } from "~/auth";
import { imapClient, imapLock } from "~/mail";

const app = new Hono();

app.use(authorized, imapClient);

app.get(
  "/",
  zValidator("query", z.object({ mailboxPath: z.string() })),
  async (c, next) => {
    const { mailboxPath } = c.req.valid("query");
    return imapLock(mailboxPath)(c, next);
  },
  async (c) => {
    const client = c.get("imapClient");
    const results = await client.fetchAll("1:5", {
      envelope: true,
      source: true,
      flags: true,
    });
    return c.json(
      await Promise.all(
        results.map(async (result) => {
          const content = await PostalMime.parse(result.source);

          return {
            id: result.uid,
            date: result.envelope.date.toISOString(),
            from: result.envelope.from,
            to: result.envelope.to,
            cc: result.envelope.cc,
            bcc: result.envelope.bcc,
            threadId: result.threadId,
            subject: result.envelope.subject,
            flags: Array.from(result.flags),
            content: content.html ?? content.text,
            attachments: content.attachments,
          };
        })
      )
    );
  }
);

export default app;
