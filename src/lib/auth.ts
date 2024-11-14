import { bearerAuth } from "hono/bearer-auth";
import { env } from "~/lib/env";

export const authorized = bearerAuth({ token: env.APP_TOKEN });
