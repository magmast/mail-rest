import { Hono } from "hono";
import adminRoute from "~/routes/admin";
import authRoute from "~/routes/auth";
import mailboxesRoute from "~/routes/mailboxes";
import mailsRoute from "./routes/mails";

const app = new Hono();

app.route("/admin", adminRoute);

app.route("/auth", authRoute);

app.route("/mailboxes", mailboxesRoute);

app.route("/mails", mailsRoute);

export default app;
