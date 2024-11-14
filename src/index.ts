import { Hono } from "hono";
import { logger } from "hono/logger";
import mailboxesRoute from "~/routes/mailboxes";
import { authorized } from "~/lib/auth";

const app = new Hono();

app.use(logger(), authorized);

app.route("/mailboxes", mailboxesRoute);

export default app;
