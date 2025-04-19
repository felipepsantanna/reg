import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';
import { getUserProfile } from '@/lib/db-operations';
import { cookies } from 'next/headers';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const token = cookies().get('admin_token');

        if (!token) {
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token.value, new TextEncoder().encode(process.env.JWT_SECRET));

        if (payload.role !== 'admin') {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const { status } = body;

        if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
            return NextResponse.json(
                { error: 'Status inválido' },
                { status: 400 }
            );
        }

        await pool.execute(
            'UPDATE user_profiles SET status = ?, updated_at = NOW() WHERE user_id = ?',
            [status, params.id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar perfil' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {

    try {
        const { id } = params;
        request = request;
        const row = await getUserProfile(parseInt(id));

        if (row.length === 0) {
            return NextResponse.json(
                { error: 'Perfil não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json(row);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar perfil' },
            { status: 500 }
        );
    }
}
