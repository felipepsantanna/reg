import { NextResponse } from 'next/server';
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
    email: string;
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Buscar perfil com email do usuário
        const [rows] = await pool.execute<ProfileRow[]>(`
            SELECT p.*, u.email 
            FROM profiles p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.id = ? AND p.status = 'approved'
        `, [params.id]);

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Perfil não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: rows[0] });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar perfil' },
            { status: 500 }
        );
    }
} 