import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getMediaById, deleteMediaById } from '@/lib/db-operations';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function DELETE(
    _request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;

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

            if (!userId || userId === 0) {
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

            if (media && media.user_id === userId) {
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
                        throw new Error('Erro na hora de remover a imagem no Bunny');
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
                        throw new Error('Erro na hora de remover o vídeo no Bunny');
                    }
                }

                // Remove do banco de dados apenas se a remoção no Bunny deu certo ou se for mídia órfã
                await deleteMediaById(Number(id));
            }

        } catch (e) {
            console.error('Erro ao deletar mídia:', e);
            return NextResponse.json(
                { message: 'Erro na hora de remover a mídia' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { success: true, message: 'Removido com sucesso' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Erro interno no DELETE:', error);
        return NextResponse.json(
            { error: 'Erro ao processar a exclusão' },
            { status: 500 }
        );
    }
}