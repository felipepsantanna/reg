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

// PATCH /api/admin/cadastros/[id]/status
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    if (!verificarAutenticacao()) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const { id } = params;
        const { status } = await request.json();

        if (!status || !['ativo', 'inativo'].includes(status)) {
            return NextResponse.json(
                { error: 'Status inválido' },
                { status: 400 }
            );
        }

        // Aqui você deve implementar a lógica para atualizar o status no seu banco de dados
        // Este é um exemplo com dados mockados
        console.log(`Atualizando status do cadastro ${id} para ${status}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar status' },
            { status: 500 }
        );
    }
} 