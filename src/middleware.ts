import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Verificar se é uma rota administrativa
    if (path.startsWith('/admin')) {
        // Permitir acesso à página de login e à rota de login da API
        if (path === '/admin/login' || path === '/api/admin/login') {
            return NextResponse.next();
        }

        // Verificar token para outras rotas administrativas
        const token = request.cookies.get('admin_token')?.value;

        if (!token) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        try {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET);
            const { payload } = await jwtVerify(token, secret);

            if (payload.role !== 'admin') {
                return NextResponse.redirect(new URL('/admin/login', request.url));
            }

            return NextResponse.next();
        } catch (error) {
            console.error('Erro ao verificar token:', error);
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    // Verificar se é uma rota de dashboard
    if (path.startsWith('/dashboard')) {
        const token = request.cookies.get('auth_token');

        // Se não houver token, redirecionar para login
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        try {
            // Verificar token
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key');
            const { payload } = await jwtVerify(token.value, secret);

            // Verificar se é anunciante
            if (payload.role !== 'anunciante') {
                return NextResponse.redirect(new URL('/login', request.url));
            }

            return NextResponse.next();
        } catch (error) {
            // Token inválido ou expirado
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*']
}; 