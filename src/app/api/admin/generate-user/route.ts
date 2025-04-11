import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createUser } from '@/lib/db-operations';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

function generateRandomEmail() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let email = '';
    for (let i = 0; i < 10; i++) {
        email += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${email}@example.com`;
}

function generateRandomPassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

export async function POST(request: Request) {
    try {
        const token = cookies().get('admin-token');

        if (!token) {
            return NextResponse.json(
                { message: 'Não autorizado' },
                { status: 401 }
            );
        }

        try {
            await jwtVerify(
                token.value,
                new TextEncoder().encode(JWT_SECRET)
            );
        } catch (error) {
            return NextResponse.json(
                { message: 'Token inválido' },
                { status: 401 }
            );
        }

        const email = generateRandomEmail();
        const password = generateRandomPassword();

        // Salvar o usuário no banco de dados
        await createUser(email, password);

        return NextResponse.json({
            email,
            password
        });
    } catch (error) {
        console.error('Erro ao gerar usuário:', error);
        return NextResponse.json(
            { message: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
} 