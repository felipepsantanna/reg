'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GenerateUserModal from './GenerateUserModal';

interface UserCredentials {
    email: string;
    password: string;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [users, setUsers] = useState<UserCredentials[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleLogout = () => {
        document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        router.push('/admin/login');
    };

    const handleGenerateUser = () => {
        setIsModalOpen(true);
    };

    const handleUserGenerated = (newUser: UserCredentials) => {
        setUsers(prev => [...prev, newUser]);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Sair
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="mb-6">
                        <button
                            onClick={handleGenerateUser}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Gerar Novo Usuário
                        </button>
                    </div>

                    {users.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Senha
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {user.password}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <GenerateUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onGenerate={handleUserGenerated}
            />
        </div>
    );
} 