import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
import { getUserProfile } from '@/lib/db-operations';
import { stringToSlug } from '@/lib/string-operations';
import sharp from 'sharp';
import _path from 'path';
import fs from 'fs/promises'

export interface MediaApiResponse {
    thumbnail: string;
    url: string;
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const contentType = file.type || "";
        const isVideo = contentType.startsWith('video/');

        if (!file) {
            return NextResponse.json(
                { error: 'Nenhum arquivo fornecido' },
                { status: 400 }
            );
        }
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token');

        if (!token) {
            return NextResponse.json(
                { message: 'Não autorizado' },
                { status: 401 }
            );
        }

        let userId: number;
        try {
            const { payload } = await jwtVerify(
                token.value,
                new TextEncoder().encode(JWT_SECRET)
            );
            userId = payload.userId as number;
        } catch (error) {
            return NextResponse.json(
                { message: 'Token inválido' },
                { status: 401 }
            );
        }


        if (!isVideo) {
            const user = await getUserProfile(userId);
            const path = `${await stringToSlug(user.sexo)}/${await stringToSlug(user.nome)}`;


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



const uploadToBunnyStorage = async (file: File, path: string): Promise<MediaApiResponse> => {
    // Dados do Bunny Storage
    const storageHost = process.env.BUNNY_STORAGE_HOST!;
    const storageName = process.env.BUNNY_STORAGE_NAME!;
    const accessKey = process.env.BUNNY_STORAGE_ACCESS!;
    const pullZoneUrl = "capitalsexy.b-cdn.net";

    const uploadUrl = `${storageHost}/${storageName}/${path}/${file.name}`;

    const bytes = await file.arrayBuffer();
    const bufferOriginal = Buffer.from(bytes);

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
        console.log('height: ' + metadata.width!);
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
    console.log('metadata gerada')
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

    // Finalmente, compor a segunda marca d'água (redimensionada) sobre o resultado anterior
    const bufferFinal = await sharp(bufferComPrimeiraMarca)
        .composite([{
            input: bufferMarcaDaguaCenterRedimensionada,
            gravity: 'center' // 'gravity' aqui é opcional, pois as imagens têm o mesmo tamanho
        }])
        .toBuffer();

    try {
        const uploadResponse = await fetch(`${uploadUrl}`, {
            method: 'PUT',
            headers: {
                'AccessKey': accessKey,
                'Content-Type': 'application/octet-stream',
                'accept': 'application/json'
            },
            body: bufferFinal,
        });

        console.log(uploadResponse)

        if (!uploadResponse.ok) {
            throw new Error(`Erro no upload: ${uploadResponse.statusText}`);
        }
        const publicUrl = `https://${pullZoneUrl}/${path}/${file.name}`;

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
