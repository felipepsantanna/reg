import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByResetToken, updateUserPasswordAndClearToken } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { token, password } = await request.json();

        if (!token || typeof token !== 'string') {
            return NextResponse.json(
                { error: 'Token de redefinição não informado ou inválido' },
                { status: 400 }
            );
        }

        if (!password || typeof password !== 'string' || password.length < 6) {
            return NextResponse.json(
                { error: 'A nova senha deve ter no mínimo 6 caracteres' },
                { status: 400 }
            );
        }

        // Buscar usuário pelo token válido e não expirado
        const user = await findUserByResetToken(token);

        if (!user) {
            return NextResponse.json(
                { error: 'Link de redefinição inválido ou expirado. Por favor, solicite um novo link.' },
                { status: 400 }
            );
        }

        // Criptografar nova senha com salt 10
        const hashedPassword = await bcrypt.hash(password, 10);

        // Atualizar senha e limpar token
        const success = await updateUserPasswordAndClearToken(user.id, hashedPassword);

        if (!success) {
            return NextResponse.json(
                { error: 'Não foi possível atualizar a senha. Tente novamente mais tarde.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.'
        });
    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar a redefinição de senha' },
            { status: 500 }
        );
    }
}
