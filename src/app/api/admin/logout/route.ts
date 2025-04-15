import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        const cookieStore = cookies();
        cookieStore.delete('admin_token');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        return NextResponse.json(
            { error: 'Erro ao fazer logout' },
            { status: 500 }
        );
    }
} 