import { NextRequest, NextResponse } from 'next/server';
import { getMediaByIds, deleteMediaByIds } from '@/lib/db-operations';
import { getAuthenticatedUser } from '@/lib/auth-user';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const session = await getAuthenticatedUser(request, body?.viewAs);

        if (!session) {
            return NextResponse.json(
                { message: 'Não autorizado' },
                { status: 401 }
            );
        }

        const rawIds = body?.ids;
        if (!Array.isArray(rawIds) || rawIds.length === 0) {
            return NextResponse.json(
                { message: 'Nenhum ID de mídia fornecido' },
                { status: 400 }
            );
        }

        const ids = rawIds
            .map(id => Number(id))
            .filter(id => !isNaN(id) && id > 0);

        if (ids.length === 0) {
            return NextResponse.json(
                { message: 'Nenhum ID válido fornecido' },
                { status: 400 }
            );
        }

        const mediaList = await getMediaByIds(ids);

        if (!mediaList || mediaList.length === 0) {
            return NextResponse.json(
                { success: true, count: 0, message: 'Nenhuma mídia encontrada no banco de dados' },
                { status: 200 }
            );
        }

        // Permissão: somente dono ou admin
        const authorizedMedia = mediaList.filter(
            (m: any) => m.user_id === session.userId || session.isAdmin
        );

        if (authorizedMedia.length === 0) {
            return NextResponse.json(
                { message: 'Sem permissão para remover as mídias selecionadas' },
                { status: 403 }
            );
        }

        const storageHost = process.env.BUNNY_STORAGE_HOST;
        const storageName = process.env.BUNNY_STORAGE_NAME;
        const accessKeyCDN = process.env.BUNNY_STORAGE_ACCESS;
        const libraryId = process.env.BUNNY_LIBRARY_ID;
        const accessKeyVideo = process.env.BUNNY_ACCESS_KEY;

        // Remoção em lote na Bunny CDN em paralelo
        const deletePromises = authorizedMedia.map(async (media: any) => {
            try {
                if (media.type === 'image') {
                    if (!storageHost || !storageName || !accessKeyCDN) return;

                    let pathComLogo = media.url;
                    try {
                        const parsedUrl = new URL(media.url);
                        pathComLogo = decodeURIComponent(parsedUrl.pathname).replace(/^\/+/, '');
                    } catch {
                        const replacedUrl = process.env.BUNNY_STORAGE_URL || '';
                        pathComLogo = media.url.replace(replacedUrl, '').replace(/^\/+/, '');
                    }

                    // 1. Versão com logo
                    const deleteImageUrl = `${storageHost}/${storageName}/${pathComLogo}`;
                    await fetch(deleteImageUrl, {
                        method: 'DELETE',
                        headers: {
                            'AccessKey': accessKeyCDN,
                        },
                    });

                    // 2. Versão original sem logo (se existir)
                    const lastSlash = pathComLogo.lastIndexOf('/');
                    if (lastSlash !== -1) {
                        const dir = pathComLogo.substring(0, lastSlash);
                        const filename = pathComLogo.substring(lastSlash + 1);
                        const pathOriginal = `${dir}/originais/${filename}`;

                        const deleteOriginalUrl = `${storageHost}/${storageName}/${pathOriginal}`;
                        await fetch(deleteOriginalUrl, {
                            method: 'DELETE',
                            headers: {
                                'AccessKey': accessKeyCDN,
                            },
                        });
                    }
                } else if (media.type === 'video') {
                    if (!libraryId || !accessKeyVideo) return;
                    const url = `https://video.bunnycdn.com/library/${libraryId}/videos/${media.url}`;
                    await fetch(url, {
                        method: 'DELETE',
                        headers: {
                            'AccessKey': accessKeyVideo,
                        },
                    });
                }
            } catch (cdnErr) {
                console.warn(`Aviso ao excluir mídia ${media.id} na Bunny CDN:`, cdnErr);
            }
        });

        await Promise.allSettled(deletePromises);

        // Remoção definitiva no banco de dados
        const authorizedIds = authorizedMedia.map((m: any) => Number(m.id));
        await deleteMediaByIds(authorizedIds, session.isAdmin ? undefined : session.userId);

        return NextResponse.json({
            success: true,
            count: authorizedIds.length,
            deletedIds: authorizedIds,
            message: `${authorizedIds.length} mídia(s) removida(s) com sucesso`
        });

    } catch (error) {
        console.error('Erro na rota de exclusão em massa:', error);
        return NextResponse.json(
            { error: 'Erro ao processar exclusão em massa' },
            { status: 500 }
        );
    }
}
