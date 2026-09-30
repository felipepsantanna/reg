import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getAuditLogs } from '@/lib/db-operations';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    _request: NextRequest,
    context: RouteContext
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('admin_token');

        if (!token) {
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token.value, new TextEncoder().encode(JWT_SECRET));

        if (payload.role !== 'admin') {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
        }

        // 3. AGUARDE o desmembramento dos params antes de usar o id
        const { id } = await context.params;

        const logs = await getAuditLogs(parseInt(id));

        return NextResponse.json(logs);
    } catch (error) {
        console.error('Erro ao buscar logs:', error);
        return NextResponse.json(
            { error: 'Erro ao processar requisição' },
            { status: 500 }
        );
    }
}