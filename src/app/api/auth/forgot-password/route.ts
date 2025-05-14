import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Resend } from 'resend';
import { findUserByEmail } from '@/lib/db';


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
        //const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

        // Criar link de reset
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha?token=${resetToken}`;
        const resend = new Resend(process.env.RESEND_ACCESS_KEY);
        const resendresp = await resend.emails.send({
        from: process.env.RESEND_FROM!, // Substitua pelo seu endereço de e-mail verificado no Resend
        to: [email],
        subject: 'Redefinição de Senha',
        html: `<p>Você solicitou a redefinição da sua senha.</p>
               <p>Clique no link abaixo para criar uma nova senha:</p>
               <p><a href="${resetUrl}">Redefinir Senha</a></p>
               <p>Se você não solicitou esta redefinição, pode ignorar este e-mail.</p>`,
      });
      console.log(resendresp);
        return NextResponse.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções para prosseguir.' });
    } catch (error) {
        console.error('Erro ao processar recuperação de senha:', error);
        return NextResponse.json(
            { error: 'Erro ao processar a solicitação' },
            { status: 500 }
        );
    }
} 