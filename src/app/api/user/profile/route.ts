import { NextRequest, NextResponse } from 'next/server';
import { saveUserProfile, getUserProfile, updateUserProfile, saveAuditLogs } from '@/lib/db-operations';
import { getUpdatedFields } from '@/lib/getUpdatedFields';
import { getAuthenticatedUser } from '@/lib/auth-user';

export async function POST(request: NextRequest) {
    try {
        const profileData = await request.json();
        const session = await getAuthenticatedUser(request, profileData.viewAs);

        if (!session) {
            return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
        }

        const userId = session.userId;
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

export async function GET(request: NextRequest) {
    try {
        const session = await getAuthenticatedUser(request);
        console.log('[DEBUG GET /api/user/profile] Session:', session);

        if (!session) {
            console.log('[DEBUG GET /api/user/profile] Sem sessão - 401');
            return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
        }

        const userId = session.userId;
        const profile = await getUserProfile(userId);
        console.log(`[DEBUG GET /api/user/profile] userId: ${userId}, profile:`, profile ? profile.nome : 'null');

        // Se o perfil ainda não existe no banco (primeiro acesso), retorna null com status 200
        return NextResponse.json({ data: profile || null });
    } catch (error) {
        console.error('[DEBUG GET /api/user/profile] Erro ao buscar perfil:', error);
        return NextResponse.json(
            { message: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}