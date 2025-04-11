import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { getUserByEmail, verifyPassword } from '@/lib/db-operations';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        // Buscar usuário no banco de dados
        const user = await getUserByEmail(email);

        if (!user) {
            return NextResponse.json(
                { message: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        // Verificar senha
        const isValidPassword = await verifyPassword(password, user.password);

        if (!isValidPassword) {
            return NextResponse.json(
                { message: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        // Criar token JWT
        const token = await new SignJWT({
            email: user.email,
            userId: user.id
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(new TextEncoder().encode(JWT_SECRET));

        // Configurar cookie
        cookies().set('admin-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 24 horas
            path: '/',
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro no login:', error);
        return NextResponse.json(
            { message: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
} 