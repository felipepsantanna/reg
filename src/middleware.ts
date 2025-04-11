import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

export async function middleware(request: NextRequest) {
    // Verificar se é uma rota administrativa
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Ignorar a rota de login
        if (request.nextUrl.pathname === '/admin/login') {
            return NextResponse.next();
        }

        // Obter o token do cookie
        const token = request.cookies.get('admin-token');

        if (!token) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        try {
            // Verificar o token
            await jwtVerify(
                token.value,
                new TextEncoder().encode(JWT_SECRET)
            );

            return NextResponse.next();
        } catch (error) {
            // Token inválido ou expirado
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
}; 