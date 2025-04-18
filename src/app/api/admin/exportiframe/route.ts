import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

export async function POST(request: Request) {

    try {
        const token = cookies().get('admin_token');

        if (!token) {
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token.value, new TextEncoder().encode(JWT_SECRET));

        if (payload.role !== 'admin') {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
        }

        const { userId } = await request.json();
        const response = await fetch(`${process.env.URL_BASE}/api/profiles/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        //const iframeCode = `<iframe src="${window.location.origin}/profile/${userId}" width="100%" height="600" frameborder="0"></iframe> `;
        console.log(response);


        const resp = await fetch(`${process.env.URL_BASE}/profile/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log(resp);


        /*
        const iframeCode = `<iframe src="${window.location.origin}/profile/${userId}" width="100%" height="600" frameborder="0"></iframe>`;
        const blob = new Blob([iframeCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iframe-${userId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        */

        const iframeCode = '';
        return NextResponse.json({ success: true, data: iframeCode });
    }
    catch (error) {
        console.error('Erro ao exportar o iframe:', error);
        return NextResponse.json(
            { error: 'Erro ao exportar o iframe' },
            { status: 500 }
        );
    }
}