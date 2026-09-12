import { NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/db-operations';
import { stringToSlug } from '@/lib/string-operations';
import { getAuthenticatedUser } from '@/lib/auth-user';
import sharp from 'sharp';
import _path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export interface MediaApiResponse {
    thumbnail: string;
    url: string;
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const viewAsForm = formData.get('viewAs') as string | null;
        const contentType = file.type || "";
        const isVideo = contentType.startsWith('video/');

        if (!file) {
            return NextResponse.json(
                { error: 'Nenhum arquivo fornecido' },
                { status: 400 }
            );
        }

        const session = await getAuthenticatedUser(request, viewAsForm);
        if (!session) {
            return NextResponse.json(
                { message: 'Não autorizado' },
                { status: 401 }
            );
        }

        const userId = session.userId;

        if (!isVideo) {
            const user = await getUserProfile(userId);
            const path = (user?.sexo && user?.nome)
                ? `${await stringToSlug(user.sexo)}/${await stringToSlug(user.nome)}`
                : `perfil/${userId}`;

            const imageResp = await uploadToBunnyStorage(file as File, path);
            return NextResponse.json(imageResp);
        }
        else {
            return NextResponse.json(
                { error: 'Nenhum arquivo de imagem fornecido' },
                { status: 400 }
            );
        }
        /*else {
            const videoResp = await uploadToBunnyCDN(file as File, contentType);
            return NextResponse.json(videoResp);
        }*/


    } catch (error) {
        console.error('Erro no upload:', error);
        return NextResponse.json(
            { error: 'Erro ao fazer upload do arquivo' },
            { status: 500 }
        );
    }
}

/**
 * Gera um nome de arquivo baseado no hash SHA-256 do buffer original.
 * Ambas as versões (original e com logo) usam o mesmo nome, diferenciadas apenas pelo path.
 */
function gerarNomeArquivo(buffer: Buffer): string {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return `${hash.substring(0, 12)}.webp`;
}

const uploadToBunnyStorage = async (file: File, path: string): Promise<MediaApiResponse> => {
    // Dados do Bunny Storage
    const storageHost = process.env.BUNNY_STORAGE_HOST!;
    const storageName = process.env.BUNNY_STORAGE_NAME!;
    const accessKey = process.env.BUNNY_STORAGE_ACCESS!;
    const pullZoneUrl = "capitalsexy.b-cdn.net";

    const bytes = await file.arrayBuffer();
    const bufferOriginal = Buffer.from(bytes);

    // Gerar nome de arquivo baseado no hash do conteúdo original
    const nomeArquivo = gerarNomeArquivo(bufferOriginal);

    // ── 1. Upload do arquivo original (sem marca d'água) ──────────────────────
    // Path: {path}/originais/{hash}.webp — nunca exposto no site
    const uploadUrlOriginal = `${storageHost}/${storageName}/${path}/originais/${nomeArquivo}`;
    const uploadOriginalResp = await fetch(uploadUrlOriginal, {
        method: 'PUT',
        headers: {
            'AccessKey': accessKey,
            'Content-Type': 'application/octet-stream',
            'accept': 'application/json',
        },
        body: bufferOriginal,
    });


    if (!uploadOriginalResp.ok) {
        const errText = await uploadOriginalResp.text();
        console.error(`Falha ao salvar original no Bunny: ${uploadOriginalResp.status} — ${errText}`);
        // Não lançamos erro aqui para não bloquear o upload principal
    } else {
        console.log(`Original salvo em: ${path}/originais/${nomeArquivo}`);
    }

    // ── 2. Aplicar marcas d'água ──────────────────────────────────────────────
    const watermarkPath = _path.resolve(process.cwd(), 'public', 'watermark.png');
    const watermarkAllPath = _path.resolve(process.cwd(), 'public', 'watermark-all.png');
    const bufferMarcaDaguaGlobal = await fs.readFile(watermarkPath);
    const bufferMarcaDaguaCenter = await fs.readFile(watermarkAllPath);

    let resizeOptions = {};
    const metadata = await sharp(bufferOriginal).metadata();
    console.log(metadata);
    if (metadata.height! > metadata.width!) {
        console.log('height: ' + metadata.height!);
        resizeOptions = {
            height: 615,
            // height: alturaMaxima, // Você pode adicionar uma altura máxima também se necessário
            fit: sharp.fit.inside, // 'inside' garante que caiba nas dimensões sem cortar, mantendo a proporção.
            // Se apenas 'width' é fornecido, 'fit' não é estritamente necessário,
            // pois o Sharp ajustará a altura proporcionalmente.
            // Usar 'fit: sharp.fit.contain' ou 'fit: sharp.fit.cover' pode ter outros comportamentos.
            withoutEnlargement: true // Não aumenta a imagem se ela já for menor que a larguraMaxima
        };
    }
    else {
        console.log('width: ' + metadata.width!);
        resizeOptions = {
            width: 615,
            // height: alturaMaxima, // Você pode adicionar uma altura máxima também se necessário
            fit: sharp.fit.inside, // 'inside' garante que caiba nas dimensões sem cortar, mantendo a proporção.
            // Se apenas 'width' é fornecido, 'fit' não é estritamente necessário,
            // pois o Sharp ajustará a altura proporcionalmente.
            // Usar 'fit: sharp.fit.contain' ou 'fit: sharp.fit.cover' pode ter outros comportamentos.
            withoutEnlargement: true // Não aumenta a imagem se ela já for menor que a larguraMaxima
        }
    };

    console.log('metadata gerada');
    const bufferComPrimeiraMarca = await sharp(bufferOriginal)
        .resize(resizeOptions)
        .composite([{
            input: bufferMarcaDaguaGlobal,
            gravity: 'southeast'
        }])
        .toBuffer();


    console.log('Primeira marca d\'água (canto) aplicada.');

    const metadataProcessado = await sharp(bufferComPrimeiraMarca).metadata();
    const larguraFinal = metadataProcessado.width;
    const alturaFinal = metadataProcessado.height;

    const bufferMarcaDaguaCenterRedimensionada = await sharp(bufferMarcaDaguaCenter)
        .resize({
            width: larguraFinal,
            height: alturaFinal,
            fit: sharp.fit.cover // 'cover' para cobrir a área, 'fill' para esticar
        })
        .toBuffer();
    console.log('Marca d\'água central redimensionada para cobrir a imagem.');

    // Composição final: segunda marca d'água (centralizada e redimensionada)
    const bufferFinal = await sharp(bufferComPrimeiraMarca)
        .composite([{
            input: bufferMarcaDaguaCenterRedimensionada,
            gravity: 'center'
        }])
        .toBuffer();

    // ── 3. Upload da versão com marca d'água ──────────────────────────────────
    // Path: {path}/{hash}.webp — URL exibida no site, mesmo nome do original
    const uploadUrlComLogo = `${storageHost}/${storageName}/${path}/${nomeArquivo}`;

    try {
        const uploadResponse = await fetch(uploadUrlComLogo, {
            method: 'PUT',
            headers: {
                'AccessKey': accessKey,
                'Content-Type': 'application/octet-stream',
                'accept': 'application/json'
            },
            body: bufferFinal,
        });

        console.log(uploadResponse);

        if (!uploadResponse.ok) {
            throw new Error(`Erro no upload: ${uploadResponse.statusText}`);
        }

        const publicUrl = `https://${pullZoneUrl}/${path}/${nomeArquivo}`;

        const response = {
            thumbnail: publicUrl,
            url: publicUrl
        };

        return response;
    } catch (err: any) {
        console.error('Erro ao fazer upload para Bunny Storage:', err);
        throw err;
    }
}
