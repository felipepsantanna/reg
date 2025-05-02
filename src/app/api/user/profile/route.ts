import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { saveUserProfile, getUserProfile, updateUserProfile } from '@/lib/db-operations';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

export async function POST(request: Request) {
    try {
        const token = cookies().get('auth_token');

        if (!token) {
            return NextResponse.json(
                { message: 'Não autorizado' },
                { status: 401 }
            );
        }

        let userId: number;
        try {
            const { payload } = await jwtVerify(
                token.value,
                new TextEncoder().encode(JWT_SECRET)
            );
            userId = payload.userId as number;
        } catch (error) {
            return NextResponse.json(
                { message: 'Token inválido' },
                { status: 401 }
            );
        }

        const profileData = await request.json();

        // Validar campos obrigatórios
        const requiredFields = ['nome', 'telefone', 'sexo', 'idade', 'altura', 'peso'];
        for (const field of requiredFields) {
            if (!profileData[field]) {
                return NextResponse.json(
                    { message: `Campo ${field} é obrigatório` },
                    { status: 400 }
                );
            }
        }

        // Validar campo dote apenas quando o sexo for "trans"
        if (profileData.sexo === 'trans' && !profileData.tamanho_dote) {
            return NextResponse.json(
                { message: 'O campo Tamanho do Dote é obrigatório para pessoas trans' },
                { status: 400 }
            );
        }

        // Validar arrays
        if (!Array.isArray(profileData.local_atendimento) || !Array.isArray(profileData.atende) || !Array.isArray(profileData.forma_pagamento)) {
            return NextResponse.json(
                { message: 'Campos de arrays inválidos' },
                { status: 400 }
            );
        }

        // Validar redes sociais
        if (!Array.isArray(profileData.redes_sociais)) {
            return NextResponse.json(
                { message: 'Campo redes_sociais inválido' },
                { status: 400 }
            );
        }

        for (const rede of profileData.redes_sociais) {
            if (!rede.tipo || !rede.url) {
                return NextResponse.json(
                    { message: 'Dados de rede social inválidos' },
                    { status: 400 }
                );
            }
        }

        // Verificar se o perfil já existe
        const existingProfile = await getUserProfile(userId);

        let result;
        if (existingProfile) {
            // Atualizar perfil existente
            result = await updateUserProfile(userId, profileData);

            if (result.affectedRows !== 0) {
                if (existingProfile.status === 'approved') {
                    const respExportIframe = await fetch(`/api/admin/exportiframe`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ userId: userId })
                    });
                    console.log(respExportIframe);
                }

            }

        } else {
            // Criar novo perfil
            result = await saveUserProfile(userId, profileData);
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

export async function GET(/*request: Request*/) {
    try {
        const token = cookies().get('auth_token');

        if (!token) {
            return NextResponse.json(
                { message: 'Não autorizado' },
                { status: 401 }
            );
        }

        let userId: number;
        try {
            const { payload } = await jwtVerify(
                token.value,
                new TextEncoder().encode(JWT_SECRET)
            );
            userId = payload.userId as number;
        } catch (error) {
            return NextResponse.json(
                { message: 'Token inválido' },
                { status: 401 }
            );
        }

        const profile = await getUserProfile(userId);

        if (!profile) {
            return NextResponse.json(
                { message: 'Perfil não encontrado' },
                { status: 404 }
            );
        }

        // Converter campos JSON de volta para arrays/objetos
        const formattedProfile = {
            ...profile,
            local_atendimento: JSON.parse(profile.local_atendimento),
            atende: JSON.parse(profile.atende),
            forma_pagamento: JSON.parse(profile.forma_pagamento),
            redes_sociais: JSON.parse(profile.redes_sociais)
        };

        return NextResponse.json({ data: formattedProfile });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        return NextResponse.json(
            { message: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
} 