import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export interface AuthSession {
    userId: number;
    isAdmin: boolean;
    originalAdminId?: number;
}

/**
 * Autentica o usuário da requisição e resolve o ID do usuário alvo.
 * - Se for informado viewAs: verifica se é Administrador (admin_token) para permitir personificação.
 *   Se for admin, opera sobre o userId de viewAs. Anunciantes comuns NUNCA podem personificar.
 * - Se NÃO for informado viewAs: prioriza a sessão de anunciante (auth_token).
 *   Se não houver auth_token, mas houver admin_token, opera sobre o ID do admin.
 */
export async function getAuthenticatedUser(
    request?: Request,
    viewAsOverride?: string | number | null
): Promise<AuthSession | null> {
    try {
        const cookieStore = await cookies();
        const adminToken = cookieStore.get('admin_token')?.value;
        const authToken = cookieStore.get('auth_token')?.value;
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key');

        console.log('[DEBUG getAuthenticatedUser] cookies presentes:', {
            hasAdminToken: !!adminToken,
            hasAuthToken: !!authToken,
            url: request?.url
        });

        // Extrai targetId a partir de viewAs (override, query param ou header)
        let targetId: number | null = null;
        if (viewAsOverride !== undefined && viewAsOverride !== null) {
            const parsed = Number(viewAsOverride);
            if (!isNaN(parsed) && parsed > 0) targetId = parsed;
        }

        if (!targetId && request) {
            try {
                const url = new URL(request.url, 'http://localhost:3000');
                const qParam = url.searchParams.get('viewAs');
                if (qParam) {
                    const parsed = Number(qParam);
                    if (!isNaN(parsed) && parsed > 0) targetId = parsed;
                }
            } catch {
                // URL inválida
            }

            if (!targetId) {
                const headerVal = request.headers.get('x-view-as');
                if (headerVal) {
                    const parsed = Number(headerVal);
                    if (!isNaN(parsed) && parsed > 0) targetId = parsed;
                }
            }
        }

        // 1. Caso viewAs esteja presente: SOMENTE Administrador tem permissão
        if (targetId) {
            if (adminToken) {
                try {
                    const { payload } = await jwtVerify(adminToken, secret);
                    if (payload.role === 'admin') {
                        return {
                            userId: targetId,
                            isAdmin: true,
                            originalAdminId: payload.userId as number
                        };
                    }
                } catch {
                    // adminToken inválido
                }
            }
            // Anunciante comum que tentar passar viewAs é ignorado e cai no fluxo padrão abaixo
        }

        // 2. Caso padrão (sem viewAs): prioriza a sessão de Anunciante (auth_token)
        if (authToken) {
            try {
                const { payload } = await jwtVerify(authToken, secret);
                if (payload.userId) {
                    return {
                        userId: payload.userId as number,
                        isAdmin: false
                    };
                }
            } catch {
                // authToken inválido
            }
        }

        // 3. Se não há auth_token, mas há admin_token válido (admin acessando diretamente)
        if (adminToken) {
            try {
                const { payload } = await jwtVerify(adminToken, secret);
                if (payload.role === 'admin') {
                    return {
                        userId: targetId ?? (payload.userId as number),
                        isAdmin: true,
                        originalAdminId: payload.userId as number
                    };
                }
            } catch {
                // adminToken inválido
            }
        }

        return null;
    } catch (error) {
        console.error('Erro na verificação de autenticação:', error);
        return null;
    }
}
