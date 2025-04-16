import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { cookies } from 'next/headers';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

interface UserRow extends RowDataPacket {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
    updated_at: string;
    media_count: number;
}

export async function GET() {
    try {

        const token = cookies().get('admin_token');
        console.log(token);
        if (!token) {
            return NextResponse.json(
                { error: 'Token administrativo não fornecido' },
                { status: 401 }
            );
        }

        try {
            const { payload } = await jwtVerify(token.value, new TextEncoder().encode(JWT_SECRET));
            console.log(payload);
            if (payload.role !== 'admin') {
                return NextResponse.json(
                    { error: 'Acesso não autorizado' },
                    { status: 403 }
                );
            }

            // Buscar usuários no banco de dados ordenados por updated_at desc
            const [users] = await pool.execute<UserRow[]>(`
                SELECT 
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    u.created_at,
                    u.updated_at,
                    COUNT(m.id) as media_count
                FROM users u
                LEFT JOIN media m ON u.id = m.user_id
                GROUP BY u.id
                ORDER BY u.updated_at DESC
            `);

            return NextResponse.json({ users });
        } catch (error) {
            return NextResponse.json(
                { error: 'Token administrativo inválido' },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
} 