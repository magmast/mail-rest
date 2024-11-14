import { int, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { nanoid } from "nanoid";

export const accounts = sqliteTable("accounts", {
  id: text()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  host: text().notNull(),
  port: int().notNull(),
  username: text().notNull().unique(),
  password: text().notNull(),
});

export type SelectAccount = typeof accounts.$inferSelect;

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
});
