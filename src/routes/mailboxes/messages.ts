import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import PostalMime from "postal-mime";
import { decodeMailboxPath, imapLock } from "~/lib/mail";
import { FetchMessageObject } from "imapflow";
import v from "validator";

function toListMessageDTO(message: FetchMessageObject) {
  return {
    id: message.uid,
    date: message.envelope.date.toISOString(),
    from: message.envelope.from,
    to: message.envelope.to,
    cc: message.envelope.cc,
    bcc: message.envelope.bcc,
    threadId: message.threadId,
    subject: message.envelope.subject,
    flags: Array.from(message.flags),
  };
}

async function toMessageDTO(message: FetchMessageObject) {
  const parsed = await PostalMime.parse(message.source);

  return {
    id: parsed.messageId,
    date: message.envelope.date.toISOString(),
    from: message.envelope.from,
    to: message.envelope.to,
    cc: message.envelope.cc,
    bcc: message.envelope.bcc,
    threadId: message.threadId,
    subject: message.envelope.subject,
    flags: Array.from(message.flags),
    content: parsed.html ?? parsed.text,
  };
}

const app = new Hono();

app.get(
  "/:mailboxPath{.+}/messages",
  zValidator(
    "param",
    z.object({ mailboxPath: z.string().transform(decodeMailboxPath) })
  ),
  zValidator(
    "query",
    z.object({
      offset: z
        .string()
        .default("0")
        .refine(
          (value) => v.isInt(value, { min: 0 }),
          "Must be a positive integer."
        )
        .transform((value) => Number(value) + 1),
      limit: z
        .string()
        .default("10")
        .refine(
          (value) => v.isInt(value, { min: 1, max: 100 }),
          "Must be an integer in range from 1 to 100."
        )
        .transform((value) => Number(value) - 1),
    })
  ),
  async (c, next) => {
    const mailboxPath = c.req.param("mailboxPath");
    return imapLock(mailboxPath)(c, next);
  },
  async (c) => {
    const mailboxPath = c.req.param("mailboxPath");
    const { limit, offset } = c.req.valid("query");
    const client = c.get("imapClient");

    const mailboxStatus = await client.status(mailboxPath, { messages: true });
    const totalMessages = mailboxStatus.messages;
    if (totalMessages == null) {
      throw new HTTPException(500);
    }
    if (totalMessages === 0) {
      return c.json({
        total: 0,
        hasPreviousPage: false,
        hasNextPage: false,
        data: [],
      });
    }

    const start = Math.min(offset, totalMessages);
    const end = Math.min(offset + limit, totalMessages);
    const messages = await client.fetchAll(`${start}:${end}`, {
      envelope: true,
      flags: true,
      threadId: true,
    });
    const data = messages.map(toListMessageDTO);

    return c.json({
      total: totalMessages,
      hasPreviousPage: start > 1,
      hasNextPage: end < totalMessages,
      data,
    });
  }
);

app.get(
  "/:mailboxPath{.+}/messages/:id",
  async (c, next) => {
    const mailboxPath = c.req.param("mailboxPath");
    return imapLock(mailboxPath)(c, next);
  },
  async (c) => {
    const id = c.req.param("id");

    const client = c.get("imapClient");
    const message = await client.fetchOne(id, {
      uid: true,
      source: true,
      envelope: true,
      flags: true,
      threadId: true,
    });

    return c.json({
      data: await toMessageDTO(message),
    });
  }
);

export default app;
