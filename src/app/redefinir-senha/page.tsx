'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

function RedefinirSenhaForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!token) {
        return (
            <div className="space-y-6 text-center">
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">
                    <p className="font-semibold">Link inválido</p>
                    <p className="mt-1">Nenhum token de verificação foi encontrado neste link.</p>
                </div>
                <Link
                    href="/esqueceu-senha"
                    className="inline-block w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Solicitar novo link de recuperação
                </Link>
                <div className="text-sm">
                    <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Voltar para o login
                    </Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('A senha deve conter no mínimo 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao redefinir senha');
            }

            setSuccess(true);
            toast.success('Senha alterada com sucesso!');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao processar a solicitação';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="space-y-6 text-center">
                <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-4 rounded-md text-sm" role="alert">
                    <p className="font-semibold">Senha alterada com sucesso!</p>
                    <p className="mt-1">Sua nova senha já está ativa. Você já pode fazer login.</p>
                </div>
                <div>
                    <Link
                        href="/login"
                        className="w-full inline-block py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-center"
                    >
                        Fazer Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
                <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Nova Senha
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={6}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirmar Nova Senha
                    </label>
                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        minLength={6}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Repita a nova senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Redefinir Senha'}
                </button>
            </div>

            <div className="flex flex-col gap-2 text-sm text-center">
                <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Voltar para o login
                </Link>
                <Link href="/esqueceu-senha" className="text-gray-500 hover:text-gray-700 text-xs">
                    Precisa de outro link? Solicitar novamente
                </Link>
            </div>
        </form>
    );
}

export default function RedefinirSenhaPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-lg shadow-md">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">
                        Criar Nova Senha
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Informe sua nova senha de acesso abaixo
                    </p>
                </div>
                <Suspense fallback={<div className="text-center text-sm text-gray-500 py-4">Carregando formulário...</div>}>
                    <RedefinirSenhaForm />
                </Suspense>
            </div>
        </div>
    );
}
