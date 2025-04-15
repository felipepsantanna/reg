import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'Nenhum arquivo fornecido' },
                { status: 400 }
            );
        }

        const s3Client = new S3Client({
            endpoint: process.env.NEXT_PUBLIC_API_S3,
            region: 'auto',
            credentials: {
                accessKeyId: process.env.NEXT_PUBLIC_API_S3_ACCESSKEY!,
                secretAccessKey: process.env.NEXT_PUBLIC_API_S3_SECRET_KEY!
            }
        });

        const timestamp = new Date().getTime();
        const randomString = Math.random().toString(36).substring(7);
        const fileExtension = file.name.split('.').pop();
        const fileName = `${timestamp}-${randomString}.${fileExtension}`;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const command = new PutObjectCommand({
            Bucket: process.env.NEXT_PUBLIC_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: file.type
        });

        await s3Client.send(command);

        const url = `https://cdn.rocktools.com.br/${fileName}`;

        return NextResponse.json({ url });
    } catch (error) {
        console.error('Erro no upload:', error);
        return NextResponse.json(
            { error: 'Erro ao fazer upload do arquivo' },
            { status: 500 }
        );
    }
} 