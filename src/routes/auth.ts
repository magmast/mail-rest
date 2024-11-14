import { Hono } from "hono";
import { authorizeHandlers, refreshHandlers } from "~/auth";

const app = new Hono();

app.post("/", ...authorizeHandlers);

app.post("/refresh", ...refreshHandlers);

export default app;
