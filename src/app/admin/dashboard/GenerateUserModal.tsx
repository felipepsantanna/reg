'use client';

import { useState } from 'react';

interface UserCredentials {
    email: string;
    password: string;
}

interface GenerateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (user: UserCredentials) => void;
}

export default function GenerateUserModal({ isOpen, onClose, onGenerate }: GenerateUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleGenerate = async () => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');

            const response = await fetch('/api/admin/generate-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao gerar usuário');
            }

            setSuccess('Usuário gerado com sucesso!');
            onGenerate(data);

            // Fechar a modal após 2 segundos
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao gerar usuário');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4">Gerar Novo Usuário</h2>

                <p className="text-gray-600 mb-4">
                    Clique no botão abaixo para gerar um novo usuário com credenciais aleatórias.
                </p>

                {error && (
                    <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
                        {success}
                    </div>
                )}

                <div className="flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Gerando...' : 'Gerar Usuário'}
                    </button>
                </div>
            </div>
        </div>
    );
} 