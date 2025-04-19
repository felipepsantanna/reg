import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface ProfileRow extends RowDataPacket {
    id: number;
    user_id: number;
    nome: string;
    telefone: string;
    sexo: string;
    tamanhoDote?: string;
    idade: number;
    altura: number;
    peso: number;
    localAtendimento: string;
    atende: string;
    formaPagamento: string;
    descricao: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: Date;
    updated_at: Date;
}

export async function GET(request: Request) {
    try {
        // Verificar token de administrador
        const token = request.headers.get('admin-token');
        if (!token) {
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
        }

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        if (payload.role !== 'admin') {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
        }

        // Buscar perfis ordenados por updated_at
        const [rows] = await pool.execute<ProfileRow[]>(`
            SELECT p.*, u.email 
            FROM profiles p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.updated_at DESC
        `);

        return NextResponse.json({ data: rows });
    } catch (error) {
        console.error('Erro ao buscar perfis:', error);
        return NextResponse.json({ error: 'Erro ao buscar perfis' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        // Verificar token de administrador
        const token = request.headers.get('admin-token');
        if (!token) {
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
        }

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        if (payload.role !== 'admin') {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
        }

        const { id, status } = await request.json();

        // Atualizar status do perfil
        await pool.execute(
            'UPDATE user_profiles SET status = ? WHERE user_id = ?',
            [status, id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar status do perfil:', error);
        return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 });
    }
} 