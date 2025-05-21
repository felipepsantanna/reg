import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
import { getUserProfile } from '@/lib/db-operations';
/*import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";*/
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
        const contentType = formData.get('fileType') as string;
        const isVideo = contentType.startsWith('video/');

        if (!file) {
            return NextResponse.json(
                { error: 'Nenhum arquivo fornecido' },
                { status: 400 }
            );
        }

        const token = cookies().get('auth_token');
       
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

        if (isVideo) {
            const videoResp = await uploadToBunnyCDN(file as File, contentType);
            return NextResponse.json(videoResp);
        }
        else {
            const user = await getUserProfile(userId);
            const path = `${stringToSlug(user.sexo)}/${stringToSlug(user.nome)}`;

            
            const imageResp = await uploadToBunnyStorage(file as File, path);
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

/*const uploadToCloudflare = async (file: File): Promise<MediaApiResponse> => {
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
};*/

const uploadToBunnyStorage = async (file: File, path: string): Promise<MediaApiResponse> => {
    // Dados do Bunny Storage
    const storageHost = process.env.BUNNY_STORAGE_HOST!;
    const storageName = process.env.BUNNY_STORAGE_NAME!;
    const accessKey = process.env.BUNNY_STORAGE_ACCESS!;
    const pullZoneUrl = "capitalsexy.b-cdn.net"; 

    const uploadUrl = `${storageHost}/${storageName}/${path}/${file.name}`;
    
    const bytes = await file.arrayBuffer();
    const bufferOriginal = Buffer.from(bytes);
   
    const watermarkPath =  _path.resolve(process.cwd(), 'public', 'watermark.png');
   
    const bufferMarcaDaguaGlobal = await fs.readFile(watermarkPath);
    
    const bufferProcessado = await sharp(bufferOriginal)
      .composite([{ input: bufferMarcaDaguaGlobal,
                gravity: 'southeast'}])
      // .toFormat('jpeg', { quality: 80 }) // Exemplo: converter para JPEG com qualidade 80
      .toBuffer();
    
    try {
        const uploadResponse = await fetch(`${uploadUrl}`, {
            method: 'PUT',
            headers: {
                'AccessKey': accessKey,
                'Content-Type': 'application/octet-stream',
                'accept': 'application/json'
            },
            body: bufferProcessado,
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
const stringToSlug = (str: string): string => {
  if (!str) {
    return '';
  }

  // Remove caracteres especiais e acentos, converte para minúsculo
  const normalizedStr = str
    .normalize('NFD') // Decompõe caracteres acentuados em base + combining diacritic
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritics
    .toLowerCase();

  // Substitui espaços e outros caracteres indesejados por hífens
  const slug = normalizedStr
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/[^\w-]+/g, '') // Remove caracteres não alfanuméricos (exceto hífens)
    .replace(/^-+|-+$/g, ''); // Remove hífens no início e no final

  return slug;
}