import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface MediaApiResponse {
    thumbnail: string;
    url: string;
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const contentType = formData.get('fileType') as string;
        const isVideo = contentType.startsWith('video/');

        if (!file) {
            return NextResponse.json(
                { error: 'Nenhum arquivo fornecido' },
                { status: 400 }
            );
        }

        if (isVideo) {
            const videoResp = await uploadToBunnyCDN(file as File, contentType);
            return NextResponse.json(videoResp);
        }
        else {
            const imageResp = await uploadToCloudflare(file as File);
            return NextResponse.json(imageResp);
        }


    } catch (error) {
        console.error('Erro no upload:', error);
        return NextResponse.json(
            { error: 'Erro ao fazer upload do arquivo' },
            { status: 500 }
        );
    }
}


const uploadToBunnyCDN = async (file: File, contentType: string): Promise<MediaApiResponse> => {
    const libraryId = process.env.BUNNY_LIBRARY_ID;
    const accessKey = process.env.BUNNY_ACCESS_KEY;

    if (!libraryId || !accessKey) {
        throw new Error('Configurações do Bunny CDN não encontradas');
    }

    try {
        // Primeiro, criar o vídeo na biblioteca
        const createEndpoint = `https://video.bunnycdn.com/library/${libraryId}/videos`;
        const createResponse = await fetch(createEndpoint, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'AccessKey': accessKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: file.name,
                collectionId: null,
                length: 0,
                status: 'uploading'
            })
        });

        if (!createResponse.ok) {
            throw new Error(`Erro ao criar vídeo: ${createResponse.statusText}`);
        }

        const createData = await createResponse.json();
        const videoId = createData.guid;

        // Agora, fazer o upload do arquivo
        const uploadEndpoint = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;
        const uploadResponse = await fetch(uploadEndpoint, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'AccessKey': accessKey,
                'Content-Type': contentType
            },
            body: file
        });

        if (!uploadResponse.ok) {
            throw new Error(`Erro ao fazer upload do vídeo: ${uploadResponse.statusText}`);
        }
        const response = {
            thumbnail: `https://vz-ddb4a7c6-db0.b-cdn.net/${videoId}/thumbnail.jpg`,
            url: `${videoId}`
        };

        return response;
    } catch (error) {
        console.error('Erro ao fazer upload para Bunny CDN:', error);
        throw error;
    }
};

const uploadToCloudflare = async (file: File): Promise<MediaApiResponse> => {
    try {

        const s3Client = new S3Client({
            endpoint: process.env.API_S3,
            region: 'auto',
            credentials: {
                accessKeyId: process.env.API_S3_ACCESSKEY!,
                secretAccessKey: process.env.API_S3_SECRET_KEY!
            }
        });

        const timestamp = new Date().getTime();
        const randomString = Math.random().toString(36).substring(7);
        const fileExtension = file.name.split('.').pop();
        const fileName = `${timestamp}-${randomString}.${fileExtension}`;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const command = new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: file.type
        });

        await s3Client.send(command);


        const response = {
            thumbnail: `https://cdn.rocktools.com.br/${fileName}`,
            url: `https://cdn.rocktools.com.br/${fileName}`
        };

        return response;
    } catch (error) {
        console.error('Erro ao fazer upload para Cloudflare:', error);
        throw error;
    }
};
