import { Hono } from "hono";
import accountsRoute from "./accounts";

const app = new Hono();

app.route("/accounts", accountsRoute);

export default app;
