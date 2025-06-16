import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { saveMedia, getMediaByUserId, getMediaById, updateMediaPositions } from '@/lib/db-operations';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

export async function POST(request: Request) {
    try {
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

        const { type, thumbnail, url, position } = await request.json();

        if (!type || !url || position === undefined) {
            return NextResponse.json(
                { message: 'Dados incompletos' },
                { status: 400 }
            );
        }

        const result = await saveMedia(userId, type, thumbnail, url, position);


        const data = await getMediaById(result.insertId)

        return NextResponse.json({ success: true, data: data });
    } catch (error) {
        console.error('Erro ao salvar mídia:', error);
        return NextResponse.json(
            { message: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
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

        const { mediaPositions } = await request.json();

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