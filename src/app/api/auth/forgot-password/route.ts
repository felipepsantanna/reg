import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { findUserByEmail } from '@/lib/db';

// Configuração do transporter do nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        // Verificar se o usuário existe
        const user = await findUserByEmail(email);

        if (!user) {
            // Por segurança, não informamos se o e-mail existe ou não
            return NextResponse.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' });
        }

        // Gerar token único
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora
        console.log(resetTokenExpiry)

        // Criar link de reset
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha?token=${resetToken}`;

        // Enviar e-mail
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: 'Recuperação de Senha',
            html: `
                <h1>Recuperação de Senha</h1>
                <p>Você solicitou a recuperação de senha. Clique no link abaixo para redefinir sua senha:</p>
                <a href="${resetUrl}">${resetUrl}</a>
                <p>Este link expira em 1 hora.</p>
                <p>Se você não solicitou a recuperação de senha, ignore este e-mail.</p>
            `,
        });

        return NextResponse.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' });
    } catch (error) {
        console.error('Erro ao processar recuperação de senha:', error);
        return NextResponse.json(
            { error: 'Erro ao processar a solicitação' },
            { status: 500 }
        );
    }
} 