import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
import { getMediaById } from '@/lib/db-operations';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {

    try {
        const { id } = params;
        console.log(`Requisição DELETE para /api/upload/${id}`);
        request = request;

        const token = cookies().get('auth_token');

        if (!token) {
            return NextResponse.json(
                { message: 'Não autorizado' },
                { status: 401 }
            );
        }

        let userId: number;
        try {
            const { payload } = await jwtVerify(
                token.value,
                new TextEncoder().encode(JWT_SECRET)
            );
            userId = payload.userId as number;
            if(userId == 0){
                return NextResponse.json(
                { message: 'Token inválido' },
                { status: 401 }
            );
            }
        } catch (error) {
            return NextResponse.json(
                { message: 'Token inválido' },
                { status: 401 }
            );
        }

        const media = await getMediaById(Number(id));
        console.log(media)


         return NextResponse.json(
            { error: 'ok' },
            { status: 200 }
        );


    } catch (error) {
        console.error('Erro no upload:', error);
        return NextResponse.json(
            { error: 'Erro ao fazer upload do arquivo' },
            { status: 500 }
        );
    }
}