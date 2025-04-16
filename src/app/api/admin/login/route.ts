import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { getUser } from '@/lib/db-operations';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        // Validar credenciais
        const user = await getUser(email, password);
        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Credenciais inválidas'
            }, { status: 401 });
        }

        if (user.role !== 'admin') {
            return NextResponse.json({
                success: false,
                error: 'Acesso não autorizado'
            }, { status: 403 });
        }

        // Criar token JWT
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const token = await new SignJWT({ userId: user.id, role: user.role })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secret);

        // Definir cookie
        cookies().set('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 // 24 horas
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro no login do administrador:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
} 