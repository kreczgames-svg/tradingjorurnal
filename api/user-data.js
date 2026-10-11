import { db } from "../db/index.js";
import { userData } from "../db/schema.js";
import { eq } from "drizzle-orm";

const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT = "6acaa66f00286e56a49c";

async function getUserId(req) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return null;
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return null;
    
    try {
        const res = await fetch(`${APPWRITE_ENDPOINT}/account`, {
            headers: { "X-Appwrite-Project": APPWRITE_PROJECT, "X-Appwrite-JWT": jwt },
        });
        if (!res.ok) return null;
        const user = await res.json();
        return typeof user?.id === "string" ? user.id : null;
    } catch (e) {
        return null;
    }
}

export default async function handler(req, res) {
    const userId = await getUserId(req);
    if (!userId) {
        return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    if (req.method === "GET") {
        const rows = await db.select().from(userData).where(eq(userData.userId, userId));
        const data = {};
        for (const r of rows) data[r.key] = r.value;
        return new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (req.method === "PUT") {
        const body = await req.json().catch(() => null);
        if (!body || typeof body.key !== "string") {
            return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        // Mentés logika...
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    return new Response("Method not allowed", { status: 405 });
}