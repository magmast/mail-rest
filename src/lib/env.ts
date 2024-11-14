import { z } from "zod";

const schema = z.object({
  APP_TOKEN: z.string(),

  IMAP_HOST: z.string(),
  IMAP_PORT: z.string().transform(Number),
  IMAP_USER: z.string(),
  IMAP_PASS: z.string(),
});

export const env = schema.parse(process.env);
