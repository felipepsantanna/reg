import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { createUser, getUserByEmail } from '@/lib/db-operations';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, confirmPassword } = body;

        // 1. Validações básicas
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return NextResponse.json(
                { error: 'Forneça um endereço de e-mail válido.' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!password || typeof password !== 'string' || password.length < 6) {
            return NextResponse.json(
                { error: 'A senha deve ter pelo menos 6 caracteres.' },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: 'As senhas não coincidem.' },
                { status: 400 }
            );
        }

        // 2. Verificar se o e-mail já está em uso
        const existingUser = await getUserByEmail(normalizedEmail);
        if (existingUser) {
            return NextResponse.json(
                { error: 'Este e-mail já está cadastrado. Tente fazer login ou recuperar a senha.' },
                { status: 400 }
            );
        }

        // 3. Criar usuário no banco de dados como anunciante
        const result = await createUser(normalizedEmail, password, 'anunciante', 'ativo');
        const userId = result.insertId;

        // 4. Gerar token JWT e autenticar automaticamente
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key');
        const token = await new SignJWT({ userId, role: 'anunciante' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secret);

        const cookieStore = await cookies();
        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 // 24 horas
        });

        return NextResponse.json({
            success: true,
            redirectTo: '/dashboard'
        });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar o cadastro.' },
            { status: 500 }
        );
    }
}
