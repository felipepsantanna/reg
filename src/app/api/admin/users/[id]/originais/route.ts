import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getMediaByUserId } from "@/lib/db-operations";
import { RowDataPacket } from "mysql2";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";

interface RouteContext {
    params: Promise<{ id: string }>;
}

interface MediaRow extends RowDataPacket {
    id: number;
    user_id: number;
    type: "image" | "video";
    url: string;
    thumbnail: string;
    position: number;
}

function deriveOriginalUrl(urlComLogo: string): string {
    const lastSlash = urlComLogo.lastIndexOf("/");
    const dir = urlComLogo.substring(0, lastSlash);
    const filename = urlComLogo.substring(lastSlash + 1);
    return `${dir}/originais/${filename}`;
}

export async function GET(
    _request: Request,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const userId = Number(id);

        if (isNaN(userId) || userId <= 0) {
            return NextResponse.json({ error: "ID invalido" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get("admin_token");

        if (!token) {
            return NextResponse.json({ error: "Token nao fornecido" }, { status: 401 });
        }

        const { payload } = await jwtVerify(token.value, new TextEncoder().encode(JWT_SECRET));

        if (payload.role !== "admin") {
            return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
        }

        const allMedia = await getMediaByUserId(userId) as MediaRow[];
        const images = allMedia.filter((m) => m.type === "image");

        const result = images.map((img) => ({
            id: img.id,
            position: img.position,
            url_com_logo: img.url,
            url_original: deriveOriginalUrl(img.url),
        }));

        return NextResponse.json({ data: result });
    } catch (error) {
        console.error("Erro ao buscar fotos originais:", error);
        return NextResponse.json({ error: "Erro ao buscar fotos originais" }, { status: 500 });
    }
}