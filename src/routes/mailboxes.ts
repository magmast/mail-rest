import { Hono } from "hono";
import { authorized } from "~/auth";
import { imapClient } from "~/mail";

const app = new Hono();

app.use(authorized, imapClient);

app.get("/", async (c) => {
  const client = c.get("imapClient");
  const responses = await client.list();
  return c.json(
    responses.map((response) => ({
      name: response.name,
      path: response.path,
      delimiter: response.delimiter,
      flags: Array.from(response.flags),
    }))
  );
});

export default app;
