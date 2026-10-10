import { NextRequest, NextResponse } from 'next/server';
import { getMediaById, deleteMediaById } from '@/lib/db-operations';
import { getAuthenticatedUser } from '@/lib/auth-user';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;

        const session = await getAuthenticatedUser(request);

        if (!session) {
            return NextResponse.json(
                { message: 'Não autorizado' },
                { status: 401 }
            );
        }

        try {
            const media = await getMediaById(Number(id));

            if (!media) {
                return NextResponse.json(
                    { success: true, message: 'Mídia já não existe no banco de dados' },
                    { status: 200 }
                );
            }

            if (media.user_id !== session.userId && !session.isAdmin) {
                return NextResponse.json(
                    { message: 'Sem permissão para remover esta mídia' },
                    { status: 403 }
                );
            }

            if (media.type === 'image') {
                const storageHost = process.env.BUNNY_STORAGE_HOST!;
                const storageName = process.env.BUNNY_STORAGE_NAME!;
                const accessKeyCDN = process.env.BUNNY_STORAGE_ACCESS!;

                // Path da versão com logo: ex. feminino/nome/a3f8c1d2.webp
                // Extrai de forma resiliente o pathname da URL para suportar tanto o CDN atual quanto domínios legados
                let pathComLogo = media.url;
                try {
                    const parsedUrl = new URL(media.url);
                    pathComLogo = decodeURIComponent(parsedUrl.pathname).replace(/^\/+/, '');
                } catch {
                    const replacedUrl = process.env.BUNNY_STORAGE_URL || '';
                    pathComLogo = media.url.replace(replacedUrl, '').replace(/^\/+/, '');
                }

                // ── 1. Deletar versão com logo no Bunny ───────────────────
                const deleteImageUrl = `${storageHost}/${storageName}/${pathComLogo}`;
                const deleteImageResp = await fetch(deleteImageUrl, {
                    method: 'DELETE',
                    headers: {
                        'AccessKey': accessKeyCDN,
                    },
                });

                if (!deleteImageResp.ok) {
                    if (deleteImageResp.status === 404) {
                        console.warn(`Aviso: imagem não encontrada no Bunny para deleção (já ausente): ${pathComLogo}`);
                    } else {
                        throw new Error(`Erro na hora de remover a imagem no Bunny (${deleteImageResp.status})`);
                    }
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
                    if (deleteVideoResp.status === 404) {
                        console.warn(`Aviso: vídeo não encontrado no Bunny Video para deleção (já ausente): ${media.url}`);
                    } else {
                        throw new Error('Erro na hora de remover o vídeo no Bunny');
                    }
                }
            }

            // Remove do banco de dados de forma definitiva
            await deleteMediaById(Number(id));

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