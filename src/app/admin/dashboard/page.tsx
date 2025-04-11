'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Cadastro {
    id: string;
    nome: string;
    telefone: string;
    email: string;
    dataCadastro: string;
    ultimaAtualizacao: string;
    status: 'ativo' | 'inativo';
    tipo: 'acompanhante' | 'cliente';
}

export default function AdminDashboard() {
    const [cadastros, setCadastros] = useState<Cadastro[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos');
    const [filtroTipo, setFiltroTipo] = useState<'todos' | 'acompanhante' | 'cliente'>('todos');
    const [busca, setBusca] = useState('');

    useEffect(() => {
        carregarCadastros();
    }, []);

    const carregarCadastros = async () => {
        try {
            const response = await fetch('/api/admin/cadastros');
            if (response.ok) {
                const data = await response.json();
                setCadastros(data);
            }
        } catch (error) {
            console.error('Erro ao carregar cadastros:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, novoStatus: 'ativo' | 'inativo') => {
        try {
            const response = await fetch(`/api/admin/cadastros/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: novoStatus }),
            });

            if (response.ok) {
                setCadastros(prev =>
                    prev.map(cadastro =>
                        cadastro.id === id
                            ? { ...cadastro, status: novoStatus }
                            : cadastro
                    )
                );
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
        }
    };

    const cadastrosFiltrados = cadastros.filter(cadastro => {
        const matchStatus = filtroStatus === 'todos' || cadastro.status === filtroStatus;
        const matchTipo = filtroTipo === 'todos' || cadastro.tipo === filtroTipo;
        const matchBusca = busca === '' ||
            cadastro.nome.toLowerCase().includes(busca.toLowerCase()) ||
            cadastro.email.toLowerCase().includes(busca.toLowerCase()) ||
            cadastro.telefone.includes(busca);

        return matchStatus && matchTipo && matchBusca;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Administrativo</h1>

                    {/* Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={filtroStatus}
                                onChange={(e) => setFiltroStatus(e.target.value as 'todos' | 'ativo' | 'inativo')}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="todos">Todos</option>
                                <option value="ativo">Ativos</option>
                                <option value="inativo">Inativos</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo
                            </label>
                            <select
                                value={filtroTipo}
                                onChange={(e) => setFiltroTipo(e.target.value as 'todos' | 'acompanhante' | 'cliente')}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="todos">Todos</option>
                                <option value="acompanhante">Acompanhantes</option>
                                <option value="cliente">Clientes</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Buscar
                            </label>
                            <input
                                type="text"
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Nome, email ou telefone"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Tabela de Cadastros */}
                    <div className="overflow-x-auto">
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
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Data Cadastro
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Última Atualização
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {cadastrosFiltrados.map((cadastro) => (
                                    <tr key={cadastro.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {cadastro.nome}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{cadastro.email}</div>
                                            <div className="text-sm text-gray-500">{cadastro.telefone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cadastro.tipo === 'acompanhante'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {cadastro.tipo === 'acompanhante' ? 'Acompanhante' : 'Cliente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {format(new Date(cadastro.dataCadastro), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {format(new Date(cadastro.ultimaAtualizacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cadastro.status === 'ativo'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {cadastro.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => toggleStatus(cadastro.id, cadastro.status === 'ativo' ? 'inativo' : 'ativo')}
                                                className={`${cadastro.status === 'ativo'
                                                    ? 'text-red-600 hover:text-red-900'
                                                    : 'text-green-600 hover:text-green-900'
                                                    }`}
                                            >
                                                {cadastro.status === 'ativo' ? 'Desativar' : 'Ativar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginação */}
                    <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Mostrando <span className="font-medium">{cadastrosFiltrados.length}</span> de{' '}
                            <span className="font-medium">{cadastros.length}</span> cadastros
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 