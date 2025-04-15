"use client"
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/admin/logout', {
                method: 'POST',
            });

            if (response.ok) {
                router.push('/admin/login');
            } else {
                console.error('Erro ao fazer logout');
            }
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Painel Administrativo</h1>
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                    >
                        Sair
                    </button>
                </div>
                {/* Conteúdo do painel administrativo aqui */}
            </div>
        </div>
    );
} 