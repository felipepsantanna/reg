import { NextResponse } from 'next/server';
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

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        request = request;
        // Verificar se o perfil existe e está aprovado
        const [profileRows] = await pool.execute<RowDataPacket[]>(
            'SELECT id FROM user_profiles WHERE user_id = ? AND status = ?',
            [params.id, 'approved']
        );

        if (profileRows.length === 0) {
            return NextResponse.json(
                { error: 'Perfil não encontrado' },
                { status: 404 }
            );
        }

        // Buscar mídias do perfil
        const [mediaRows] = await pool.execute<MediaRow[]>(`
            SELECT * 
            FROM media
            WHERE user_id = ? 
            ORDER BY type, position ASC
        `, [params.id]);

        return NextResponse.json({ data: mediaRows });
    } catch (error) {
        console.error('Erro ao buscar mídias:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar mídias' },
            { status: 500 }
        );
    }
} 