import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
import { getMediaById, deleteMediaById } from '@/lib/db-operations';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {

    try {
        const { id } = params;
        request = request;

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
            if (userId == 0) {
                return NextResponse.json(
                    { message: 'Token inválido' },
                    { status: 401 }
                );
            }
        } catch (error) {
            return NextResponse.json(
                { message: 'Token inválido' },
                { status: 401 }
            );
        }

        try {


            const media = await getMediaById(Number(id));

            if (media && media.user_id == userId) {

                if (media.type === 'image') {
                    const storageHost = process.env.BUNNY_STORAGE_HOST!;
                    const storageName = process.env.BUNNY_STORAGE_NAME!;
                    const accessKeyCDN = process.env.BUNNY_STORAGE_ACCESS!;
                    const replacedUrl = process.env.BUNNY_STORAGE_URL!;
                    const path = media.url.replace(replacedUrl, "");
                    const deleteImageUrl = `${storageHost}/${storageName}/${path}`;

                    const deleteImageResp = await fetch(deleteImageUrl, {
                        method: 'DELETE',
                        headers: {
                            'AccessKey': accessKeyCDN,
                        },
                    });

                    if (!deleteImageResp.ok) {
                        throw new Error('Error na hora de remover a imagem');
                    }
                } else {
                    const libraryId = process.env.BUNNY_LIBRARY_ID;
                    const accessKey = process.env.BUNNY_ACCESS_KEY;

                    if (!libraryId || !accessKey) {
                        throw new Error('Configurações do Bunny CDN não encontradas');
                    }

                    const url = `https://video.bunnycdn.com/library/${libraryId}/videos/${media.url}`;

                    const deleteVideoResp = await fetch(url, {
                        method: 'DELETE',
                        headers: {
                            'AccessKey': accessKey,
                        },
                    });

                    if (!deleteVideoResp.ok) {
                        throw new Error('Error na hora de remover o vídeo');
                    }
                }

                await deleteMediaById(Number(id));

            }

        } catch (e) {
            return NextResponse.json(
                { message: 'Error na hora de remover a imagem' },
                { status: 500 }
            );
        }



        return NextResponse.json(
            { error: 'ok' },
            { status: 200 }
        );


    } catch (error) {
        console.error('Erro no upload:', error);
        return NextResponse.json(
            { error: 'Erro ao fazer upload do arquivo' },
            { status: 500 }
        );
    }
}