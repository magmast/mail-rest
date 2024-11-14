import { z } from "zod";

const schema = z.object({
  JWT_SECRET: z.string(),
  DB_URL: z.string(),
});

export const env = schema.parse(process.env);
