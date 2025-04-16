import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ProfileRow } from '@/types/db';
import { jwtVerify } from 'jose';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const [rows] = await pool.execute<ProfileRow[]>(
            'SELECT * FROM user_profiles WHERE user_id = ?',
            [params.id]
        );

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Perfil não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar perfil' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const token = request.headers.get('x-admin-token');
        if (!token) {
            return NextResponse.json(
                { error: 'Token não fornecido' },
                { status: 401 }
            );
        }

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        if (payload.role !== 'admin') {
            return NextResponse.json(
                { error: 'Acesso não autorizado' },
                { status: 403 }
            );
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