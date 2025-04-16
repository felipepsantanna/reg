import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';
import { UserRow } from '@/types/db';
import { cookies } from 'next/headers';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

export async function GET() {

    try {
        const token = cookies().get('admin_token');

        if (!token) {
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token.value, new TextEncoder().encode(JWT_SECRET));

        if (payload.role !== 'admin') {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
        }

        const [users] = await pool.execute<UserRow[]>(`
            SELECT 
                u.id,
                u.email,
                u.role,
                u.created_at,
                u.updated_at,
                p.nome,
                p.telefone,
                p.local_atendimento,
                p.sexo,
                p.descricao,
                COUNT(DISTINCT m.id) as media_count,
                SUM(CASE WHEN m.type = 'photo' THEN 1 ELSE 0 END) as photo_count,
                SUM(CASE WHEN m.type = 'video' THEN 1 ELSE 0 END) as video_count
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN media m ON u.id = m.user_id
            where u.role = 'anunciante'
            GROUP BY u.id, p.id
            ORDER BY u.updated_at DESC;
        `);

        return NextResponse.json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar usuários' },
            { status: 500 }
        );
    }
} 