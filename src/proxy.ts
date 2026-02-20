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

    // 2. Lógica para Rota de Dashboard (Anunciantes)
    if (path.startsWith('/dashboard')) {
        const token = request.cookies.get('auth_token')?.value;

        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        try {
            const { payload } = await jwtVerify(token, secret);

            // Verifique se o payload.role condiz com o que você emite no login
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

// 3. MATCHER ATUALIZADO (Extremamente importante)
export const config = {
    // Agora incluímos /dashboard e /api/user para garantir proteção total
    matcher: [
        '/admin/:path*',
        '/api/admin/:path*',
        '/dashboard/:path*',
        '/api/user/:path*'
    ]
};