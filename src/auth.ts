import { jwt, JwtVariables, sign } from "hono/jwt";
import { env } from "./env";
import { Context } from "hono";
import { setCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import { db } from "./db";
import { HTTPException } from "hono/http-exception";
import { add, differenceInSeconds } from "date-fns";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { accounts, SelectAccount } from "./db/schema";

declare module "hono" {
  interface ContextVariableMap {
    account: SelectAccount;
  }
}

const REFRESH_TOKEN_COOKIE_KEY = "refreshToken";
const AUTH_TOKEN_DURATION = { minutes: 15 };
const REFRESH_TOKEN_COOKIE_DURATION = { years: 1 };

const factory = createFactory<{
  Variables: JwtVariables<{ sub: string; account: SelectAccount }>;
}>();

export const authorized = factory.createMiddleware(async (c, next) =>
  jwt({ secret: env.JWT_SECRET })(c, async () => {
    const payload = c.get("jwtPayload");
    c.set("account", payload.account);
    await next();
  })
);

/**
 * Works like {@link authorized}, but allows entry for everyone, if no accounts
 * exists yet.
 */
export const authorizedButInit = factory.createMiddleware(async (c, next) => {
  const count = await db.$count(accounts);
  if (count > 0) {
    authorized(c, next);
  } else {
    await next();
  }
});

const refreshAuthorized = jwt({
  secret: env.JWT_SECRET,
  cookie: REFRESH_TOKEN_COOKIE_KEY,
});

export const authorizeHandlers = factory.createHandlers(
  zValidator("json", z.object({ username: z.string(), password: z.string() })),
  async (c) => {
    const { username, password } = c.req.valid("json");

    const account = await db.query.accounts.findFirst({
      where: (t, { eq }) => eq(t.username, username),
    });
    if (account == null) {
      throw new HTTPException(401, { message: "Invalid username or password" });
    }

    if (password !== account.password) {
      throw new HTTPException(401, { message: "Invalid username or password" });
    }

    const authToken = await createAuthToken(account);
    await createRefreshToken(c, account.id);

    return c.json({ token: authToken });
  }
);

export const refreshHandlers = factory.createHandlers(
  refreshAuthorized,
  async (c) => {
    const { sub } = c.get("jwtPayload");

    const account = await db.query.accounts.findFirst({
      where: (t, { eq }) => eq(t.id, sub),
    });
    if (!account) {
      throw new HTTPException(401, { message: "Invalid refresh token" });
    }

    const authToken = await createAuthToken(account);
    await createRefreshToken(c, account.id);

    return c.json({ token: authToken });
  }
);

async function createAuthToken(account: SelectAccount) {
  return await sign(
    {
      sub: account.id,
      account,
      exp: add(new Date(), AUTH_TOKEN_DURATION).getTime(),
    },
    env.JWT_SECRET
  );
}

async function createRefreshToken(c: Context, sub: string) {
  const refreshToken = await sign(
    {
      sub,
      exp: add(new Date(), REFRESH_TOKEN_COOKIE_DURATION).getTime(),
    },
    env.JWT_SECRET
  );

  setCookie(c, REFRESH_TOKEN_COOKIE_KEY, refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: differenceInSeconds(
      add(new Date(), AUTH_TOKEN_DURATION),
      new Date()
    ),
  });
}
