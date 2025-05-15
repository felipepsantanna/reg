'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuditLogsRow } from '@/types/db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';


export default function AuditPage({ params }: { params: { id: string } }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLogsRow[]>([]);
    const router = useRouter();

    useEffect(() => {
        const fetchUsers = async () => {
            try {

                // Obter o token do cookie
                const response = await fetch(`/api/admin/logs/${params.id}`);

                if (response.status === 401) {
                    router.push('/admin/login');
                    return;
                }

                if (!response.ok) {
                    throw new Error('Erro ao carregar usuários');
                }

                const data = await response.json();
                setAuditLogs(data);
                console.log(data)
            } catch (err) {
                setError('Erro ao carregar usuários');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center">Carregando...</div>
                </div>
            </div>
        );
    }

    if (error || !auditLogs) {
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
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Atualizações do usuário</h1>


                <div className="bg-white shadow sm:rounded-lg table-responsive">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Campo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Valor antigo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Valor novo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Data atualização
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ação
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {auditLogs.map((log) => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {log.field}
                                    </td>
                                    <td className="px-6 py-4  text-sm font-medium text-gray-900">
                                        {log.oldValue}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {log.newValue}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {format(new Date(log.updatedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex space-x-2">

                                            <button

                                                className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
                                            >
                                                <FaCheckCircle size={20}/>
                                            </button>

                                            <button

                                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                                            >
                                                <FaTimesCircle size={20}/>
                                            </button>
                                        </div>


                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>


            </div>
        </div>
    )

}