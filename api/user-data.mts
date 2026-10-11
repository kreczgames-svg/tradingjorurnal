import type { Config } from "@netlify/functions";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { userData } from "../db/schema.js";

const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT = "6acaa66f00286e56a49c";

// Only app keys are stored; "tj_owner" is device-local bookkeeping.
const validKey = (k: string) => /^tj_[\w-]{1,60}$/.test(k) && k !== "tj_owner";

// Verify the Appwrite JWT sent by the browser and return the user's id.
async function getUserId(req: Request): Promise<string | null> {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const res = await fetch(`${APPWRITE_ENDPOINT}/account`, {
    headers: { "X-Appwrite-Project": APPWRITE_PROJECT, "X-Appwrite-JWT": jwt },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return typeof user?.$id === "string" ? user.$id : null;
}

export default async (req: Request) => {
  const userId = await getUserId(req);
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });

  if (req.method === "GET") {
    const rows = await db.select().from(userData).where(eq(userData.userId, userId));
    const data: Record<string, unknown> = {};
    for (const r of rows) data[r.key] = r.value;
    return Response.json({ data });
  }

  if (req.method === "PUT") {
    const body = await req.json().catch(() => null);
    const changes = body?.data;
    if (!changes || typeof changes !== "object") {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const upserts: { userId: string; key: string; value: unknown }[] = [];
    const deletes: string[] = [];
    for (const [key, value] of Object.entries(changes)) {
      if (!validKey(key)) continue;
      if (value === null) deletes.push(key);
      else upserts.push({ userId, key, value });
    }
    if (upserts.length) {
      await db
        .insert(userData)
        .values(upserts)
        .onConflictDoUpdate({
          target: [userData.userId, userData.key],
          set: { value: sql`excluded.value`, updatedAt: sql`now()` },
        });
    }
    if (deletes.length) {
      await db.delete(userData).where(and(eq(userData.userId, userId), inArray(userData.key, deletes)));
    }
    return Response.json({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/user-data",
};
