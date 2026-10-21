import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth-user';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password, confirmPassword, viewAs } = body;

        const session = await getAuthenticatedUser(request, viewAs);

        if (!session) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            );
        }

        if (!password || typeof password !== 'string' || password.length < 6) {
            return NextResponse.json(
                { error: 'A nova senha deve ter no mínimo 6 caracteres' },
                { status: 400 }
            );
        }

        if (confirmPassword !== undefined && password !== confirmPassword) {
            return NextResponse.json(
                { error: 'As senhas não coincidem' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.execute(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, session.userId]
        );

        return NextResponse.json({
            success: true,
            message: 'Senha atualizada com sucesso'
        });
    } catch (error: any) {
        console.error('Erro ao atualizar senha do anunciante:', error);
        return NextResponse.json(
            { error: error?.message || 'Erro interno ao atualizar senha' },
            { status: 500 }
        );
    }
}
