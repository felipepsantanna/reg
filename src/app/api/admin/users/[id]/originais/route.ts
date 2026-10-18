import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getAllMediaByUserId, getUserProfile } from "@/lib/db-operations";
import { stringToSlug } from "@/lib/string-operations";
import { RowDataPacket } from "mysql2";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";

interface RouteContext {
    params: Promise<{ id: string }>;
}

interface MediaRow extends RowDataPacket {
    id: number | string;
    user_id: number;
    type: "image" | "video";
    url: string;
    thumbnail: string;
    position: number;
    deleted_at?: string | null;
}

function deriveOriginalUrl(urlComLogo: string): string {
    if (urlComLogo.includes("/originais/")) return urlComLogo;
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

        // 1. Busca todas as mídias registradas (ativas e com soft delete)
        const allMedia = (await getAllMediaByUserId(userId)) as MediaRow[];
        const images: MediaRow[] = allMedia
            .filter((m) => m.type === "image")
            .sort((a, b) => {
                const aDeleted = a.deleted_at ? 1 : 0;
                const bDeleted = b.deleted_at ? 1 : 0;
                if (aDeleted !== bDeleted) return aDeleted - bDeleted;
                return (a.position ?? 0) - (b.position ?? 0) || Number(a.id) - Number(b.id);
            });

        // 2. Coleta os nomes de arquivos já conhecidos
        const knownFilenames = new Set<string>();
        for (const img of images) {
            const fname = img.url.split("/").pop();
            if (fname) knownFilenames.add(fname);
        }

        // 3. Resgate no Bunny Storage caso haja arquivos órfãos de exclusões passadas
        const storageHost = process.env.BUNNY_STORAGE_HOST || "https://ny.storage.bunnycdn.com";
        const storageName = process.env.BUNNY_STORAGE_NAME || "cs-image-storage";
        const accessKey = process.env.BUNNY_STORAGE_ACCESS;
        const cdnBase = (process.env.BUNNY_STORAGE_URL || "https://capitalsexy.b-cdn.net/").replace(/\/+$/, "");

        if (accessKey) {
            const user = await getUserProfile(userId);
            const userPaths = new Set<string>();

            if (user?.sexo && user?.nome) {
                userPaths.add(`${await stringToSlug(user.sexo)}/${await stringToSlug(user.nome)}`);
            }
            userPaths.add(`perfil/${userId}`);

            for (const img of images) {
                try {
                    let pathStr = img.url;
                    try {
                        const parsedUrl = new URL(img.url);
                        pathStr = decodeURIComponent(parsedUrl.pathname).replace(/^\/+/, "");
                    } catch {
                        pathStr = img.url.replace(cdnBase, "").replace(/^\/+/, "");
                    }
                    const s = pathStr.lastIndexOf("/");
                    if (s !== -1) {
                        userPaths.add(pathStr.substring(0, s).replace(/\/originais$/, ""));
                    }
                } catch {
                    // ignore
                }
            }

            for (const dir of userPaths) {
                try {
                    const listUrl = `${storageHost}/${storageName}/${dir}/originais/`;
                    const res = await fetch(listUrl, {
                        headers: { AccessKey: accessKey, accept: "application/json" },
                        cache: "no-store",
                    });

                    if (res.ok) {
                        const files = await res.json();
                        if (Array.isArray(files)) {
                            for (const f of files) {
                                if (!f.IsDirectory && f.ObjectName && !knownFilenames.has(f.ObjectName)) {
                                    knownFilenames.add(f.ObjectName);
                                    images.push({
                                        id: f.Guid || f.ObjectName,
                                        user_id: userId,
                                        type: "image",
                                        url: `${cdnBase}/${dir}/${f.ObjectName}`,
                                        thumbnail: `${cdnBase}/${dir}/originais/${f.ObjectName}`,
                                        position: 999,
                                        deleted_at: new Date().toISOString(),
                                    } as any);
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.warn(`Aviso ao listar originais no Bunny para diretório ${dir}:`, err);
                }
            }
        }

        // 4. Mapeia garantindo estritamente apenas URLs originais e posições sequenciais
        const result = images.map((img, index) => ({
            id: img.id,
            position: index,
            url_com_logo: img.url,
            url_original: deriveOriginalUrl(img.url),
            is_deleted: Boolean(img.deleted_at),
        }));

        return NextResponse.json({ data: result });
    } catch (error) {
        console.error("Erro ao buscar fotos originais:", error);
        return NextResponse.json({ error: "Erro ao buscar fotos originais" }, { status: 500 });
    }
}