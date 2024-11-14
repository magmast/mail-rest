import { Hono } from "hono";
import { imapClient } from "~/lib/mail";
import messagesRoute from "./messages";

const app = new Hono();

app.use(imapClient);

app.get("/", async (c) => {
  const client = c.get("imapClient");
  const data = await client.list().then((responses) =>
    responses.map((response) => ({
      name: response.name,
      path: response.path,
      delimiter: response.delimiter,
      flags: Array.from(response.flags),
    }))
  );
  return c.json({ data });
});

app.route("/", messagesRoute);

export default app;
