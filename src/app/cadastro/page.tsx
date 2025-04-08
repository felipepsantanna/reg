'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CadastroPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        senha: '',
        confirmarSenha: '',
        telefone: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.senha !== formData.confirmarSenha) {
            alert('As senhas não coincidem!');
            return;
        }
        // Aqui você pode adicionar a lógica de cadastro
        // Por enquanto, vamos apenas mostrar uma mensagem de sucesso
        alert('Cadastro realizado com sucesso!');
        router.push('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center">Cadastro de Usuário</h1>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Nome Completo
                        </label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-md"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            className="w-full p-2 border rounded-md"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Telefone
                        </label>
                        <input
                            type="tel"
                            className="w-full p-2 border rounded-md"
                            value={formData.telefone}
                            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Senha
                        </label>
                        <input
                            type="password"
                            className="w-full p-2 border rounded-md"
                            value={formData.senha}
                            onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Confirmar Senha
                        </label>
                        <input
                            type="password"
                            className="w-full p-2 border rounded-md"
                            value={formData.confirmarSenha}
                            onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
                    >
                        Cadastrar
                    </button>
                </form>
                <p className="mt-4 text-center text-sm">
                    Já tem uma conta?{' '}
                    <button
                        onClick={() => router.push('/login')}
                        className="text-blue-500 hover:text-blue-700"
                    >
                        Faça login
                    </button>
                </p>
            </div>
        </div>
    );
} 