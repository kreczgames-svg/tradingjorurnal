import { db } from "../../db/index.js";
import { userData } from "../../db/schema.js";
import { and, eq, inArray, sql } from "drizzle-orm";

const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT = "6acaa66f00286e56a49c";

// Verifies the Appwrite JWT sent by the browser and returns the user's id.
async function getUserId(req) {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return null;
    try {
        const res = await fetch(`${APPWRITE_ENDPOINT}/account`, {
            headers: { "X-Appwrite-Project": APPWRITE_PROJECT, "X-Appwrite-JWT": jwt },
        });
        if (!res.ok) return null;
        const user = await res.json();
        return typeof user?.$id === "string" ? user.$id : null;
    } catch (e) {
        return null;
    }
}

export default async (req) => {
    const userId = await getUserId(req);
    if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });

    if (req.method === "GET") {
        const rows = await db.select().from(userData).where(eq(userData.userId, userId));
        const data = {};
        for (const r of rows) data[r.key] = r.value;
        return Response.json({ data });
    }

    if (req.method === "PUT") {
        // Body: { data: { [key]: string | null } } — null deletes the key.
        const body = await req.json().catch(() => null);
        if (!body || typeof body.data !== "object" || body.data === null) {
            return Response.json({ error: "Invalid body" }, { status: 400 });
        }
        const entries = Object.entries(body.data).filter(([k]) => k.startsWith("tj_"));
        const upserts = entries.filter(([, v]) => v !== null).map(([key, value]) => ({ userId, key, value: String(value) }));
        const deletes = entries.filter(([, v]) => v === null).map(([k]) => k);

        if (upserts.length) {
            await db.insert(userData).values(upserts).onConflictDoUpdate({
                target: [userData.userId, userData.key],
                set: { value: sql`excluded.value`, updatedAt: sql`now()` },
            });
        }
        if (deletes.length) {
            await db.delete(userData).where(and(eq(userData.userId, userId), inArray(userData.key, deletes)));
        }
        return Response.json({ success: true });
    }

    return new Response("Method not allowed", { status: 405 });
};

export const config = {
    path: "/api/user-data",
};
