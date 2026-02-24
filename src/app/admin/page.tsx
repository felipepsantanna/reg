"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    FaCheck,
    FaTimes,
    FaKey,
    FaExternalLinkAlt,
    FaCopy
} from 'react-icons/fa';
import {
    HiOutlinePhotograph,
    HiOutlineVideoCamera
} from 'react-icons/hi'; // Ícones clean para mídias
import { toast, Toaster } from 'sonner';

interface User {
    id: number;
    nome: string;
    email: string;
    telefone: string;
    user_status: string;
    updated_at: string;
    status: 'pending' | 'approved' | 'rejected';
    photo_count: number;
    video_count: number;
}

export default function AdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('todos');

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState('');

    const router = useRouter();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            if (response.status === 401) return router.push('/admin/login');
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (userId: number, newStatus: 'approved' | 'rejected') => {
        try {
            const response = await fetch(`/api/profiles/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok) throw new Error();
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            toast.success(`Perfil ${newStatus === 'approved' ? 'aprovado' : 'rejeitado'}`);
        } catch (err) {
            toast.error('Erro na operação');
        }
    };

    const handleExportIframe = async (userId: number) => {
        // Iniciamos um toast de carregamento para dar feedback imediato
        const toastId = toast.loading('Gerando código de exportação...');

        try {
            const response = await fetch(`/api/admin/exportiframe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const data = await response.json();

            // 1. Verificação de Erro (Status 401, 403, 500, etc)
            if (!response.ok) {
                // Buscamos a chave 'error' que você definiu na sua API
                throw new Error(data.error || 'Erro desconhecido no servidor');
            }

            // 2. Verificação de Sucesso
            if (data.success && data.text) {
                await navigator.clipboard.writeText(data.text);

                // Atualizamos o toast de carregamento para sucesso
                toast.success('Copiado!', {
                    id: toastId,
                    description: 'O código já está na sua área de transferência.',
                    duration: 3000
                });
            } else {
                throw new Error('A API retornou sucesso, mas sem conteúdo.');
            }

        } catch (err: any) {
            console.error("Erro na exportação:", err);

            // Atualizamos o toast de carregamento para erro com a mensagem real da API
            toast.error('Falha na exportação', {
                id: toastId,
                description: err.message,
                duration: 4000
            });
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword) return toast.error('Digite a senha');
        try {
            const res = await fetch(`/api/admin/users/${selectedUserId}/password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword })
            });
            if (!res.ok) throw new Error();
            toast.success('Senha alterada');
            setIsPasswordModalOpen(false);
            setNewPassword('');
        } catch (err) {
            toast.error('Erro ao salvar senha');
        }
    };

    const filtrados = users.filter(u => {
        const matchBusca = u.nome?.toLowerCase().includes(busca.toLowerCase()) || u.email.toLowerCase().includes(busca.toLowerCase());
        const matchStatus = filtroStatus === 'todos' || u.user_status === filtroStatus;
        return matchBusca && matchStatus;
    });

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
            <Toaster position="bottom-center" />

            <div className="max-w-6xl mx-auto px-4 py-8">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
                    <h1 className="text-2xl font-semibold tracking-tight">Admin <span className="text-slate-400 font-light">Panel</span></h1>
                    <button
                        onClick={() => router.push('/admin/cadastrar')}
                        className="text-sm bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800 transition-colors"
                    >
                        Novo Usuário
                    </button>
                </header>

                {/* Filtros Clean */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <input
                        type="text"
                        placeholder="Buscar por nome ou e-mail..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all text-slate-600 placeholder:text-slate-300"
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                    />
                    <select
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-600 cursor-pointer"
                        value={filtroStatus}
                        onChange={e => setFiltroStatus(e.target.value)}
                    >
                        <option value="todos">Todos Status</option>
                        <option value="ativo">Ativos</option>
                        <option value="inativo">Inativos</option>
                    </select>
                </div>

                {/* Tabela Responsiva */}
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                                <th className="px-6 py-4 text-center w-16 md:hidden">Status</th>
                                <th className="px-6 py-4">Usuário</th>
                                <th className="px-6 py-4 hidden md:table-cell">Mídias</th>
                                <th className="px-6 py-4 hidden md:table-cell">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtrados.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                                    {/* Status Simplificado para Mobile */}
                                    <td className="px-6 py-4 text-center md:hidden">
                                        <div className={`w-2 h-2 rounded-full mx-auto ${user.status === 'approved' ? 'bg-green-500' :
                                            user.status === 'rejected' ? 'bg-red-500' : 'bg-slate-300'
                                            }`} />
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-700">{user.nome}</div>
                                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{user.email}</div>
                                    </td>

                                    <td className="px-6 py-4 hidden md:table-cell">
                                        <div className="flex items-center gap-4 text-slate-500">
                                            <div className="flex items-center gap-1.5" title="Fotos">
                                                <HiOutlinePhotograph size={16} className="text-slate-300" />
                                                <span className="text-xs font-medium">{user.photo_count}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5" title="Vídeos">
                                                <HiOutlineVideoCamera size={16} className="text-slate-300" />
                                                <span className="text-xs font-medium">{user.video_count}</span>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 hidden md:table-cell">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tight ${user.status === 'approved' ? 'bg-green-50 text-green-600' :
                                            user.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {user.status === 'approved' ? 'Aprovado' : user.status === 'rejected' ? 'Reprovado' : 'Pendente'}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-1">
                                            {/* Lógica de Aprovação/Rejeição Condicional */}
                                            {user.status !== 'approved' && (
                                                <button onClick={() => handleUpdateStatus(user.id, 'approved')} className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-all" title="Aprovar">
                                                    <FaCheck size={14} />
                                                </button>
                                            )}
                                            {user.status !== 'rejected' && (
                                                <button onClick={() => handleUpdateStatus(user.id, 'rejected')} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all" title="Rejeitar">
                                                    <FaTimes size={14} />
                                                </button>
                                            )}

                                            <div className="w-px h-4 bg-slate-100 mx-1 self-center" />

                                            <button onClick={() => handleExportIframe(user.id)} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg transition-all" title="Copiar Iframe"><FaCopy size={13} /></button>
                                            <button onClick={() => window.open(`/dashboard?viewAs=${user.id}`, '_blank')} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg transition-all" title="Ver Dashboard"><FaExternalLinkAlt size={12} /></button>
                                            <button onClick={() => { setSelectedUserId(user.id); setIsPasswordModalOpen(true); }} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg transition-all" title="Senha"><FaKey size={13} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Clean */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 bg-slate-900/5 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-sm font-bold mb-4 text-center tracking-tight text-slate-800">Nova Senha</h3>
                        <input
                            type="password"
                            autoFocus
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setIsPasswordModalOpen(false)} className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-all">Cancelar</button>
                            <button onClick={handleChangePassword} className="flex-1 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}