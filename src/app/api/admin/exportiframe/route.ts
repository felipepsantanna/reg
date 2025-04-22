import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import * as cheerio from 'cheerio';
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


        //const iframeCode = `<iframe src="${window.location.origin}/profile/${userId}" width="100%" height="600" frameborder="0"></iframe> `;


        const response = await fetch(`${process.env.URL_BASE}/profile/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log(response.ok);
        if(response.ok){
            const html = await response.text();
            const $ = cheerio.load(html);
    
            // Extract the body content
            const bodyContent = $('body').html();
            console.log(bodyContent);
        }

        return NextResponse.json({ success: true });
    }
    catch (error) {
        console.error('Erro ao exportar o iframe:', error);
        return NextResponse.json(
            { error: 'Erro ao exportar o iframe' },
            { status: 500 }
        );
    }
}