import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        const cookieStore = await cookies(); // Adicionado await para Next.js 15
        cookieStore.delete('auth_token');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        return NextResponse.json(
            { error: 'Erro ao fazer logout' },
            { status: 500 }
        );
    }
}