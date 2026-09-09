import { NextResponse } from 'next/server';
import { saveMedia, getMediaByUserId, getMediaById, updateMediaPositions } from '@/lib/db-operations';
import { getAuthenticatedUser } from '@/lib/auth-user';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const session = await getAuthenticatedUser(request, body.viewAs);

        if (!session) {
            return NextResponse.json(
                { message: 'Não autorizado' },
                { status: 401 }
            );
        }

        const userId = session.userId;
        const { type, thumbnail, url, position } = body;

        if (!type || !url || position === undefined) {
            return NextResponse.json(
                { message: 'Dados incompletos' },
                { status: 400 }
            );
        }

        const result = await saveMedia(userId, type, thumbnail, url, position);
        const data = await getMediaById(result.insertId);

        return NextResponse.json({ success: true, data: data });
    } catch (error) {
        console.error('Erro ao salvar mídia:', error);
        return NextResponse.json(
            { message: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    try {
        const session = await getAuthenticatedUser(request);

        if (!session) {
            return NextResponse.json(
                { message: 'Não autorizado' },
                { status: 401 }
            );
        }

        const userId = session.userId;
        const media = await getMediaByUserId(userId);

        return NextResponse.json({ media });
    } catch (error) {
        console.error('Erro ao buscar mídias:', error);
        return NextResponse.json(
            { message: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const session = await getAuthenticatedUser(request, body.viewAs);

        if (!session) {
            return NextResponse.json(
                { message: 'Não autorizado' },
                { status: 401 }
            );
        }

        const userId = session.userId;
        const { mediaPositions } = body;

        if (!Array.isArray(mediaPositions)) {
            return NextResponse.json(
                { message: 'Dados inválidos' },
                { status: 400 }
            );
        }

        await updateMediaPositions(userId, mediaPositions);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar posições das mídias:', error);
        return NextResponse.json(
            { message: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}