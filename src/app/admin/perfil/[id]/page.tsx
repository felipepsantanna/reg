'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';


export default function AuditPage({ params }: { params: { id: string } }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [iframe, setIframe] = useState('');
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchUsers = async () => {
            try {

                // Obter o token do cookie
                const response = await fetch(`/api/admin/exportiframe`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId: params.id })
                });

                if (!response.ok) {
                    throw new Error('Erro ao exportar perfil');
                }

                if (response.status === 401) {
                    router.push('/admin/login');
                    return;
                }

                if (!response.ok) {
                    throw new Error('Erro ao carregar usuários');
                }

                const data = await response.json();
                setIframe(data.text);
            } catch (err) {
                setError('Erro ao carregar usuários');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [params.id]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(iframe);
            // 2. Atualizar o estado do alerta em caso de sucesso
            setAlert({
                type: 'success',
                message: 'Texto copiado para a área de transferência!',
            });
        } catch (err) {
            console.error('Falha ao copiar o texto: ', err);
            // 3. Atualizar o estado do alerta em caso de erro
            setAlert({
                type: 'error',
                message: 'Não foi possível copiar o texto.',
            });
        }

        // Opcional: fazer o alerta desaparecer após alguns segundos
        setTimeout(() => {
            setAlert(null);
        }, 3000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center">Carregando...</div>
                </div>
            </div>
        );
    }

    if (error || !iframe) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center text-red-600">{error || 'Perfil não encontrado'}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Iframe do Usuário</h1>
                {/* 4. Renderizar o alerta se o estado não for null */}
                {alert && (
                    <div className="mb-4 w-full">
                        <Alert type={alert.type} message={alert.message} />
                    </div>
                )}


                <div className="bg-white shadow sm:rounded-lg table-responsive">
                    <div className="flex flex-col items-center justify-center p-4">
                        <textarea
                            value={iframe}
                            className="w-full h-96 p-2 border rounded-md resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex justify-between w-full mt-2">
                            <p className="text-sm text-gray-500">
                                Caracteres: {iframe.length}
                            </p>
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Copiar Texto
                            </button>
                        </div>

                    </div>
                </div>


            </div>
        </div>
    )

}