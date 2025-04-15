import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
    // Verificar se é uma rota protegida
    if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/dashboard')) {
        const token = request.cookies.get('auth_token');

        // Se não houver token, redirecionar para login
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        try {
            // Verificar token
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key');
            const { payload } = await jwtVerify(token.value, secret);

            // Verificar acesso à rota admin
            if (request.nextUrl.pathname.startsWith('/admin') && payload.role !== 'admin') {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }

            // Verificar acesso à rota dashboard
            if (request.nextUrl.pathname.startsWith('/dashboard') && payload.role !== 'anunciante') {
                return NextResponse.redirect(new URL('/admin', request.url));
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
    matcher: ['/admin/:path*', '/dashboard/:path*']
}; 