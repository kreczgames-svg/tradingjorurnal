import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";

// One row per saved app key (trades, profile, theme, ...) per Appwrite user.
export const userData = pgTable(
  "user_data",
  {
    userId: text("user_id").notNull(),
    key: text().notNull(),
    value: text().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);
