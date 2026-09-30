import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function PATCH(
    request: Request,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const userId = Number(id);

        if (isNaN(userId) || userId <= 0) {
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get('admin_token');

        if (!token) {
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token.value, new TextEncoder().encode(JWT_SECRET));

        if (payload.role !== 'admin') {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
        }

        const { password } = await request.json();

        if (!password || typeof password !== 'string' || password.length < 6) {
            return NextResponse.json(
                { error: 'A senha deve ter no mínimo 6 caracteres' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.execute(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, userId]
        );

        return NextResponse.json({ success: true, message: 'Senha atualizada com sucesso' });
    } catch (error: any) {
        console.error('Erro ao atualizar senha do usuário:', error);
        return NextResponse.json(
            { error: error?.message || 'Erro interno ao atualizar senha' },
            { status: 500 }
        );
    }
}
