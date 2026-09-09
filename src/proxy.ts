// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// No Next.js 16, a função segue a convenção de nome 'proxy'
export async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key');

    // 1. Lógica para Rotas Administrativas
    if (path.startsWith('/admin')) {
        if (path === '/admin/login' || path === '/api/admin/login') {
            return NextResponse.next();
        }

        const token = request.cookies.get('admin_token')?.value;

        if (!token) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        try {
            const { payload } = await jwtVerify(token, secret);

            if (payload.role !== 'admin') {
                return NextResponse.redirect(new URL('/admin/login', request.url));
            }

            return NextResponse.next();
        } catch (error) {
            console.error('Erro ao verificar token admin:', error);
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    // 2. Lógica para Rota de Dashboard (Anunciantes ou Admin via viewAs)
    if (path.startsWith('/dashboard')) {
        const viewAs = request.nextUrl.searchParams.get('viewAs');
        const adminToken = request.cookies.get('admin_token')?.value;

        // 2.1 Se houver admin_token e viewAs, o administrador está inspecionando um anunciante
        if (adminToken && viewAs) {
            try {
                const { payload } = await jwtVerify(adminToken, secret);
                if (payload.role === 'admin') {
                    return NextResponse.next();
                }
            } catch {
                // Token de admin inválido, prossegue para checar anunciante
            }
        }

        // 2.2 Caso padrão: sessão do anunciante
        const authToken = request.cookies.get('auth_token')?.value;

        if (authToken) {
            try {
                const { payload } = await jwtVerify(authToken, secret);
                if (payload.role === 'anunciante') {
                    return NextResponse.next();
                }
            } catch {
                // Token de anunciante inválido
            }
        }

        // 2.3 Se for admin logado tentando acessar /dashboard sem viewAs, redireciona para o painel admin
        if (adminToken) {
            try {
                const { payload } = await jwtVerify(adminToken, secret);
                if (payload.role === 'admin') {
                    return NextResponse.redirect(new URL('/admin', request.url));
                }
            } catch {}
        }

        // Sem autenticação válida
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 3. Lógica para APIs de usuário e upload
    if (path.startsWith('/api/user') || path.startsWith('/api/upload')) {
        const adminToken = request.cookies.get('admin_token')?.value;
        if (adminToken) {
            try {
                const { payload } = await jwtVerify(adminToken, secret);
                if (payload.role === 'admin') {
                    return NextResponse.next();
                }
            } catch {}
        }

        const authToken = request.cookies.get('auth_token')?.value;
        if (authToken) {
            try {
                const { payload } = await jwtVerify(authToken, secret);
                if (payload.userId) {
                    return NextResponse.next();
                }
            } catch {}
        }

        return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.next();
}

// 4. MATCHER ATUALIZADO
export const config = {
    matcher: [
        '/admin',
        '/admin/:path*',
        '/api/admin/:path*',
        '/dashboard',
        '/dashboard/:path*',
        '/api/user/:path*',
        '/api/upload/:path*'
    ]
};