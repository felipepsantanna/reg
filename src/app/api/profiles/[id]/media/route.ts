import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface MediaRow extends RowDataPacket {
    id: string;
    user_id: number;
    type: 'image' | 'video';
    url: string;
    position: number;
    poster?: string;
}

// 1. Defina a interface para o contexto com params como Promise
interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    _request: NextRequest,
    context: RouteContext // 2. Use a interface aqui
) {
    try {
        // 3. Aguarde a resolução dos parâmetros
        const { id } = await context.params;

        // Verificar se o perfil existe e está aprovado
        const [profileRows] = await pool.execute<RowDataPacket[]>(
            'SELECT id FROM user_profiles WHERE user_id = ? AND status = ?',
            [id, 'approved']
        );

        if (profileRows.length === 0) {
            return NextResponse.json(
                { error: 'Perfil não encontrado' },
                { status: 404 }
            );
        }

        // Buscar mídias do perfil
        const [mediaRows] = await pool.execute<MediaRow[]>(`
            SELECT * FROM media
            WHERE user_id = ? 
            ORDER BY type, position ASC
        `, [id]);

        return NextResponse.json({ data: mediaRows });
    } catch (error) {
        console.error('Erro ao buscar mídias:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar mídias' },
            { status: 500 }
        );
    }
}