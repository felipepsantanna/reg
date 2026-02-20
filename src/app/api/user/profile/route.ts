import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { saveUserProfile, getUserProfile, updateUserProfile, saveAuditLogs } from '@/lib/db-operations';
import { getUpdatedFields } from '@/lib/getUpdatedFields';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token');

        if (!token) {
            return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
        }

        let userId: number;
        try {
            const { payload } = await jwtVerify(
                token.value,
                new TextEncoder().encode(JWT_SECRET)
            );
            userId = payload.userId as number;
        } catch (error) {
            return NextResponse.json({ message: 'Token inválido' }, { status: 401 });
        }

        const profileData = await request.json();
        // 1. Validar novos campos obrigatórios simplificados
        const requiredFields = ['nome', 'sexo', 'idade'];
        for (const field of requiredFields) {
            if (!profileData[field]) {
                return NextResponse.json(
                    { message: `Campo ${field} é obrigatório` },
                    { status: 400 }
                );
            }
        }

        // 2. Verificar se o perfil já existe
        const existingProfile = await getUserProfile(userId);

        let result;
        if (existingProfile) {
            // Log de auditoria (opcional, mas recomendado manter)
            const changes = await getUpdatedFields(existingProfile, profileData);
            if (changes && changes.length > 0) {
                await saveAuditLogs(userId, changes);
            }

            // Atualizar perfil existente
            result = await updateUserProfile(userId, {
                nome: profileData.nome,
                sexo: profileData.sexo,
                idade: profileData.idade
            });

            // Se o perfil já estiver aprovado, avisamos o sistema de exportação (opcional)
            if (existingProfile.status === 'approved') {
                try {
                    await fetch(`${process.env.URL_BASE}/api/admin/exportiframe`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: userId })
                    });
                } catch (e) {
                    console.error("Erro ao exportar iframe pós-update:", e);
                }
            }
        } else {
            // Criar novo perfil
            result = await saveUserProfile(userId, {
                nome: profileData.nome,
                sexo: profileData.sexo,
                idade: profileData.idade,
                status: 'pending' // Novo perfil nasce pendente
            });
        }

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('Erro ao salvar perfil:', error);
        return NextResponse.json(
            { message: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

export async function GET(_request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token');

        if (!token) {
            return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
        }

        let userId: number;
        try {
            const { payload } = await jwtVerify(
                token.value,
                new TextEncoder().encode(JWT_SECRET)
            );
            userId = payload.userId as number;
        } catch (error) {
            return NextResponse.json({ message: 'Token inválido' }, { status: 401 });
        }

        const profile = await getUserProfile(userId);

        if (!profile) {
            return NextResponse.json(
                { message: 'Perfil não encontrado' },
                { status: 404 }
            );
        }

        // Como não temos mais arrays complexos, não precisamos de JSON.parse
        return NextResponse.json({ data: profile });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        return NextResponse.json(
            { message: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}