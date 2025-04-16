import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Verificar se é uma rota administrativa
    if (path.startsWith('/admin')) {
        // Se for a página de login ou a rota de login da API, permitir acesso
        if (path === '/admin/login' || path === '/api/admin/login') {
            return NextResponse.next();
        }

        // Verificar token administrativo
        const adminToken = request.cookies.get('admin_token')?.value;

        if (!adminToken) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        try {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET);
            const { payload } = await jwtVerify(adminToken, secret);

            // Se não for admin, redirecionar para login
            if (payload.role !== 'admin') {
                return NextResponse.redirect(new URL('/admin/login', request.url));
            }

            return NextResponse.next();
        } catch (error) {
            // Se o token for inválido, redirecionar para login
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    // Verificar se é uma rota da API administrativa
    if (path.startsWith('/api/admin')) {
        // Se for a rota de login, permitir acesso
        if (path === '/api/admin/login') {
            return NextResponse.next();
        }

        const adminToken = request.cookies.get('admin_token');
        if (!adminToken) {
            return NextResponse.json(
                { error: 'Token administrativo não fornecido' },
                { status: 401 }
            );
        }

        try {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET);
            const { payload } = await jwtVerify(adminToken.value, secret);

            if (payload.role !== 'admin') {
                return NextResponse.json(
                    { error: 'Acesso não autorizado' },
                    { status: 403 }
                );
            }

            return NextResponse.next();
        } catch (error) {
            console.log(error);
            return NextResponse.json(
                { error: 'Token administrativo inválido' },
                { status: 401 }
            );
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