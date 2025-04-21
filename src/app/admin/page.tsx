"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface User {
    id: number;
    nome: string;
    email: string;
    telefone: string;
    role: string;
    user_status: string;
    created_at: string;
    updated_at: string;
    phone: string | null;
    city: string | null;
    state: string | null;
    birth_date: string | null;
    gender: string | null;
    occupation: string | null;
    relationship_status: string | null;
    bio: string | null;
    instagram: string | null;
    facebook: string | null;
    twitter: string | null;
    tiktok: string | null;
    youtube: string | null;
    website: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    media_count: number;
    photo_count: number;
    video_count: number;
    status: 'pending' | 'approved' | 'rejected';
}

export default function AdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchUsers = async () => {
            try {

                // Obter o token do cookie
                const response = await fetch('/api/admin/users');

                if (response.status === 401) {
                    router.push('/admin/login');
                    return;
                }

                if (!response.ok) {
                    throw new Error('Erro ao carregar usuários');
                }

                const data = await response.json();
                setUsers(data);
            } catch (err) {
                setError('Erro ao carregar usuários');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleApprove = async (userId: number) => {
        try {
            const response = await fetch(`/api/profiles/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'approved' })
            });

            if (!response.ok) {
                throw new Error('Erro ao aprovar perfil');
            }

            // Atualizar a lista de usuários
            setUsers(users.map(user =>
                user.id === userId ? { ...user, status: 'approved' } : user
            ));
        } catch (err) {
            console.error('Erro ao aprovar perfil:', err);
            setError('Erro ao aprovar perfil');
        }
    };

    const handleReject = async (userId: number) => {
        try {
            const response = await fetch(`/api/profiles/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'rejected' })
            });
            if (!response.ok) {
                throw new Error('Erro ao reprovar perfil');
            }

            // Atualizar a lista de usuários
            setUsers(users.map(user =>
                user.id === userId ? { ...user, status: 'rejected' } : user
            ));
        } catch (err) {
            console.error('Erro ao reprovar perfil:', err);
            setError('Erro ao reprovar perfil');
        }
    };

    const handleExportIframe = async (userId: number) => {

        try {
            const response = await fetch(`/api/admin/exportiframe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: userId })
            });

            if (!response.ok) {
                throw new Error('Erro ao exportar perfil');
            }

            const data = await response.json();
            console.log(data);
        } catch (err) {
            setError('Erro ao exportar perfil');
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-12 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Painel Administrativo</h1>

                <div className="flex flex-row-reverse pb-4">
                    <div className="basis-128"> <button
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-3 rounded text-xs"
                        onClick={() => router.push('/admin/cadastrar')}>
                        Novo Usuário
                    </button>
                    </div>
                </div>


                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nome
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contato
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mídias
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Última atualização
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (

                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {user.nome}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{user.email}</div>
                                        <div className="text-sm text-gray-500">{user.telefone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.media_count} (Fotos: {user.photo_count}, Vídeos: {user.video_count})
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            user.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {user.status === 'approved' ? 'Aprovado' :
                                                user.status === 'rejected' ? 'Reprovado' :
                                                    user.status === 'pending' ? 'Pendente' : ' - '}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(user.updated_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.user_status === 'ativo' && (
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleExportIframe(user.id)}
                                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
                                                >
                                                    Exportar Iframe
                                                </button>
                                                {user.status !== 'approved' && (
                                                    <button
                                                        onClick={() => handleApprove(user.id)}
                                                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs"
                                                    >
                                                        Aprovar
                                                    </button>
                                                )}
                                                {user.status !== 'rejected' && (
                                                    <button
                                                        onClick={() => handleReject(user.id)}
                                                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                                                    >
                                                        Reprovar
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
} 