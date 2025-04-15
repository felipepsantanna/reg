import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface UserRow extends RowDataPacket {
    id: number;
    email: string;
    password: string;
    role: 'admin' | 'anunciante';
}

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        // Validar campos obrigatórios
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email e senha são obrigatórios' },
                { status: 400 }
            );
        }

        // Buscar usuário no banco de dados
        const [rows] = await pool.execute<UserRow[]>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        const user = rows[0];
        if (!user) {
            return NextResponse.json(
                { error: 'Usuário não encontrado' },
                { status: 404 }
            );
        }

        // Impedir que admins façam login na rota normal
        if (user.role === 'admin') {
            return NextResponse.json(
                { error: 'Administradores devem usar a rota de login administrativo' },
                { status: 403 }
            );
        }

        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Senha incorreta' },
                { status: 401 }
            );
        }

        // Criar token JWT
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key');
        const token = await new SignJWT({
            userId: user.id,
            role: user.role,
            email: user.email
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('24h')
            .sign(secret);

        // Configurar cookie
        cookies().set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 // 24 horas
        });

        // Retornar resposta com redirecionamento baseado no papel do usuário
        return NextResponse.json({
            success: true,
            redirectTo: user.role === 'admin' ? '/admin' : '/dashboard'
        });
    } catch (error) {
        console.error('Erro no login:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
} 