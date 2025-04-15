import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('x-admin-token');

        if (!token) {
            return NextResponse.json(
                { error: 'Token não fornecido' },
                { status: 401 }
            );
        }

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        if (payload.role !== 'admin') {
            return NextResponse.json(
                { error: 'Acesso não autorizado' },
                { status: 403 }
            );
        }

        // Aqui você deve implementar a lógica para buscar os usuários do seu banco de dados
        // Por enquanto, retornaremos dados mockados
        const users = [
            {
                id: '1',
                name: 'Usuário Exemplo',
                email: 'usuario@exemplo.com',
                role: 'user',
                createdAt: new Date().toISOString()
            }
        ];

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar usuários' },
            { status: 500 }
        );
    }
} 