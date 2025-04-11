import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

// Função para verificar autenticação
const verificarAutenticacao = () => {
    const cookieStore = cookies();
    const token = cookieStore.get('admin_token');

    if (!token) {
        return false;
    }

    try {
        verify(token.value, process.env.JWT_SECRET || '');
        return true;
    } catch {
        return false;
    }
};

// GET /api/admin/cadastros
export async function GET() {
    if (!verificarAutenticacao()) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        // Aqui você deve implementar a lógica para buscar os cadastros do seu banco de dados
        // Este é um exemplo com dados mockados
        const cadastros = [
            {
                id: '1',
                nome: 'Maria Silva',
                email: 'maria@email.com',
                telefone: '(11) 99999-9999',
                dataCadastro: '2024-03-15T10:00:00Z',
                ultimaAtualizacao: '2024-03-20T15:30:00Z',
                status: 'ativo' as const,
                tipo: 'acompanhante' as const,
            },
            {
                id: '2',
                nome: 'João Santos',
                email: 'joao@email.com',
                telefone: '(11) 88888-8888',
                dataCadastro: '2024-03-10T09:00:00Z',
                ultimaAtualizacao: '2024-03-18T14:20:00Z',
                status: 'ativo' as const,
                tipo: 'cliente' as const,
            },
            // Adicione mais cadastros conforme necessário
        ];

        return NextResponse.json(cadastros);
    } catch (error) {
        console.error('Erro ao buscar cadastros:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar cadastros' },
            { status: 500 }
        );
    }
} 