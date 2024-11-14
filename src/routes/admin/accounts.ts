import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { authorizedButInit } from "~/auth";
import { db } from "~/db";
import { accounts, insertAccountSchema } from "~/db/schema";

const app = new Hono();

app.get("/", async (c) => {
  const accounts = await db.query.accounts.findMany({
    columns: {
      password: false,
    },
  });

  return c.json(accounts);
});

app.post(
  "/",
  authorizedButInit,
  zValidator("json", insertAccountSchema),
  async (c) => {
    const dto = c.req.valid("json");
    const [{ password, ...account }] = await db
      .insert(accounts)
      .values(dto)
      .returning();
    return c.json(account, 201);
  }
);

export default app;
