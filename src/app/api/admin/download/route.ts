import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";

export async function GET(request: NextRequest) {
    try {
        // Verificar admin_token
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_token");

        if (!token) {
            return NextResponse.json({ error: "Token nao fornecido" }, { status: 401 });
        }

        const { payload } = await jwtVerify(token.value, new TextEncoder().encode(JWT_SECRET));

        if (payload.role !== "admin") {
            return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
        }

        // Validar a URL solicitada
        const { searchParams } = new URL(request.url);
        const imageUrl = searchParams.get("url");

        if (!imageUrl) {
            return NextResponse.json({ error: "URL nao informada" }, { status: 400 });
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(imageUrl);
        } catch {
            return NextResponse.json({ error: "URL invalida" }, { status: 400 });
        }

        const storageHost = process.env.BUNNY_STORAGE_HOST!;
        const storageName = process.env.BUNNY_STORAGE_NAME!;
        const accessKey = process.env.BUNNY_STORAGE_ACCESS!;

        // Extrair o path relativo a partir da URL do CDN
        // Ex: https://capitalsexy.b-cdn.net/feminino/nome/originais/abc.webp
        //   → /feminino/nome/originais/abc.webp
        const relativePath = parsedUrl.pathname; // ja vem com "/" no inicio

        // Montar a URL do Bunny Storage (acesso autenticado, nao via pull zone publica)
        // Ex: https://ny.storage.bunnycdn.com/cs-image-storage/feminino/nome/originais/abc.webp
        const storageUrl = `${storageHost}/${storageName}${relativePath}`;

        // Buscar do Storage com a AccessKey (sem restricao de CORS, sem dependencia do pull zone)
        const storageRes = await fetch(storageUrl, {
            headers: {
                'AccessKey': accessKey,
            },
        });

        if (!storageRes.ok) {
            console.error(`[download] Storage retornou ${storageRes.status} para: ${storageUrl}`);
            return NextResponse.json(
                { error: `Arquivo nao encontrado no Storage: ${storageRes.status}` },
                { status: storageRes.status === 404 ? 404 : 502 }
            );
        }


        const contentType = storageRes.headers.get("content-type") || "application/octet-stream";
        const filename = relativePath.split("/").filter(Boolean).pop() || "foto.webp";
        const buffer = await storageRes.arrayBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": String(buffer.byteLength),
            },
        });
    } catch (error) {
        console.error("Erro no proxy de download:", error);
        return NextResponse.json({ error: "Erro ao baixar arquivo" }, { status: 500 });
    }
}