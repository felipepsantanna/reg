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
            'SELECT * FROM users WHERE email = ? AND role = ?',
            [email, 'admin']
        );

        const user = rows[0];
        if (!user) {
            return NextResponse.json(
                { error: 'Usuário não encontrado ou não é administrador' },
                { status: 404 }
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
        const token = await new SignJWT({
            userId: user.id,
            role: user.role,
            email: user.email
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('24h')
            .sign(new TextEncoder().encode(process.env.JWT_SECRET));

        // Configurar cookie
        cookies().set('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 24 horas
            path: '/',
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