import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Resend } from 'resend';
import { findUserByEmail, savePasswordResetToken } from '@/lib/db';

function getBaseUrl(request: Request): string {
    const origin = request.headers.get('origin');
    if (origin && origin !== 'null') {
        return origin.replace(/\/$/, '');
    }

    const referer = request.headers.get('referer');
    if (referer) {
        try {
            return new URL(referer).origin;
        } catch {
            // ignorar
        }
    }

    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || (forwardedHost?.includes('localhost') ? 'http' : 'https');
    if (forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, '');
    }

    try {
        return new URL(request.url).origin;
    } catch {
        // ignorar
    }

    return (process.env.NEXT_PUBLIC_APP_URL || process.env.URL_BASE || 'http://localhost:3000').replace(/\/$/, '');
}

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 });
        }

        // Verificar se o usuário existe
        const user = await findUserByEmail(email);

        if (!user) {
            // Por segurança, não informamos se o e-mail existe ou não
            return NextResponse.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' });
        }
        
        // Gerar token único e expiração (1 hora)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600 * 1000); // 1 hora

        // Salvar token no banco de dados
        await savePasswordResetToken(email, resetToken, resetTokenExpiry);

        // Criar link de reset dinamicamente a partir da URL da requisição
        const baseUrl = getBaseUrl(request);
        const resetUrl = `${baseUrl}/redefinir-senha?token=${resetToken}`;

        const resend = new Resend(process.env.RESEND_ACCESS_KEY);
        await resend.emails.send({
            from: process.env.RESEND_FROM!,
            to: [email],
            subject: 'Redefinição de Senha',
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                <h2 style="color: #4F46E5;">Redefinição de Senha</h2>
                <p>Você solicitou a redefinição da sua senha.</p>
                <p>Clique no botão ou no link abaixo para criar uma nova senha (válido por 1 hora):</p>
                <p style="margin: 25px 0;">
                    <a href="${resetUrl}" style="background-color: #4F46E5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Redefinir Minha Senha</a>
                </p>
                <p style="font-size: 13px; color: #666;">Ou cole este link no navegador:<br><a href="${resetUrl}">${resetUrl}</a></p>
                <p style="font-size: 13px; color: #999; margin-top: 30px;">Se você não solicitou esta redefinição, desconsidere este e-mail. Sua senha permanecerá a mesma.</p>
            </div>`,
        });

        return NextResponse.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções para prosseguir.' });
    } catch (error) {
        console.error('Erro ao processar recuperação de senha:', error);
        return NextResponse.json(
            { error: 'Erro ao processar a solicitação' },
            { status: 500 }
        );
    }
}