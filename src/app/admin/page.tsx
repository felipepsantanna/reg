"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FaCheck,
    FaTimes,
    FaKey,
    FaExternalLinkAlt,
    FaCopy,
    FaDownload,
    FaSignOutAlt
} from 'react-icons/fa';
import {
    HiOutlinePhotograph,
    HiOutlineVideoCamera,
    HiOutlineDownload
} from 'react-icons/hi';
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

interface AdminUser {
    id: number;
    email: string;
    role: string;
    user_status: string;
    created_at: string;
    updated_at: string;
}

interface OriginalPhoto {
    id: number;
    position: number;
    url_com_logo: string;
    url_original: string;
}

export default function AdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [tab, setTab] = useState<'anunciantes' | 'admins'>('anunciantes');
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('todos');

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState('');

    const [isOriginaisModalOpen, setIsOriginaisModalOpen] = useState(false);
    const [originaisNome, setOriginaisNome] = useState('');
    const [originaisData, setOriginaisData] = useState<OriginalPhoto[]>([]);
    const [originaisLoading, setOriginaisLoading] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);

    const router = useRouter();

    const handleLogout = async () => {
        const toastId = toast.loading('Saindo do painel...');
        setLogoutLoading(true);
        try {
            const res = await fetch('/api/admin/logout', { method: 'POST' });
            if (res.ok) {
                toast.success('Desconectado com sucesso', { id: toastId });
                router.push('/admin/login');
                router.refresh();
            } else {
                toast.error('Erro ao encerrar sessão', { id: toastId });
            }
        } catch {
            toast.error('Erro ao encerrar sessão', { id: toastId });
        } finally {
            setLogoutLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            if (response.status === 401) return router.push('/admin/login');
            const data = await response.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const fetchAdmins = async () => {
        try {
            const response = await fetch('/api/admin/users?role=admin');
            if (response.status === 401) return router.push('/admin/login');
            const data = await response.json();
            setAdmins(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error('Erro ao carregar administradores');
        }
    };

    const handleUpdateStatus = async (userId: number, newStatus: 'approved' | 'rejected') => {
        const toastId = toast.loading('Atualizando status...');
        try {
            const response = await fetch(`/api/profiles/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro na operação');
            }

            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            toast.success(`Perfil ${newStatus === 'approved' ? 'aprovado' : 'rejeitado'}`, { id: toastId });
        } catch (err: any) {
            toast.error(err.message || 'Erro ao atualizar status', { id: toastId });
        }
    };

    const handleExportIframe = async (userId: number) => {
        const toastId = toast.loading('Gerando código de exportação...');
        try {
            const response = await fetch(`/api/admin/exportiframe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro desconhecido no servidor');
            }

            if (data.success && data.text) {
                await navigator.clipboard.writeText(data.text);
                toast.success('Copiado!', {
                    id: toastId,
                    description: 'O código já está na sua área de transferência.',
                });
            } else {
                throw new Error('A API retornou sucesso, mas sem conteúdo.');
            }
        } catch (err: any) {
            toast.error('Falha na exportação', {
                id: toastId,
                description: err.message,
            });
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword) {
            toast.error('Digite a senha');
            return; // Adicionado explicitamente para fechar este caminho
        }

        const toastId = toast.loading('Salvando nova senha...');

        try {
            const res = await fetch(`/api/admin/users/${selectedUserId}/password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao salvar senha');
            }

            toast.success('Senha alterada com sucesso', { id: toastId });
            setIsPasswordModalOpen(false);
            setNewPassword('');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar senha', { id: toastId });
        }
        // O TS agora entende que todos os caminhos (if, try e catch) estão cobertos
    };

    const handleVerOriginais = async (userId: number, nome: string) => {
        setOriginaisNome(nome);
        setOriginaisData([]);
        setIsOriginaisModalOpen(true);
        setOriginaisLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}/originais`);
            const data = await res.json();
            if (res.ok) {
                setOriginaisData(data.data ?? []);
            } else {
                toast.error(data.error || 'Erro ao buscar fotos originais');
            }
        } catch {
            toast.error('Erro ao buscar fotos originais');
        } finally {
            setOriginaisLoading(false);
        }
    };

    const handleDownloadFoto = async (url: string, filename: string) => {
        try {
            // Proxy server-side para evitar bloqueio de CORS ao baixar do CDN
            const proxyUrl = `/api/admin/download?url=${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(objectUrl);
        } catch (err: any) {
            toast.error('Erro ao baixar foto', { description: err.message });
        }
    };

    const handleDownloadTodas = async () => {
        const toastId = toast.loading(`Baixando ${originaisData.length} fotos...`);
        for (let i = 0; i < originaisData.length; i++) {
            const foto = originaisData[i];
            const filename = foto.url_original.split('/').pop() || `foto-${foto.id}.webp`;
            await handleDownloadFoto(foto.url_original, filename);
            await new Promise(r => setTimeout(r, 300));
        }
        toast.success('Download concluido!', { id: toastId });
    };

    const filtrados = users.filter(u => {
        const matchBusca = u.nome?.toLowerCase().includes(busca.toLowerCase()) || u.email.toLowerCase().includes(busca.toLowerCase());
        const matchStatus = filtroStatus === 'todos' || u.user_status === filtroStatus;
        return matchBusca && matchStatus;
    });

    const filtradosAdmins = admins.filter(a => {
        const matchBusca = a.email.toLowerCase().includes(busca.toLowerCase());
        const matchStatus = filtroStatus === 'todos' || a.user_status === filtroStatus;
        return matchBusca && matchStatus;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center font-sans antialiased">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Carregando</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
            <Toaster position="bottom-center" richColors />

            <div className="max-w-6xl mx-auto px-4 py-8">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <h1 className="text-2xl font-semibold tracking-tight">Admin <span className="text-slate-400 font-light">Panel</span></h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push('/admin/cadastrar')}
                            className="text-sm bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800 transition-colors shadow-sm"
                        >
                            Novo Usuário
                        </button>
                        <button
                            onClick={handleLogout}
                            disabled={logoutLoading}
                            className="text-sm border border-slate-200 text-slate-600 px-4 py-2.5 rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                            title="Sair do painel administrativo"
                        >
                            <FaSignOutAlt size={13} />
                            <span>Sair</span>
                        </button>
                    </div>
                </header>

                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                    <button
                        onClick={() => setTab('anunciantes')}
                        className={`text-xs font-semibold px-4 py-2 rounded-full transition-all ${
                            tab === 'anunciantes'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        Anunciantes ({users.length})
                    </button>
                    <button
                        onClick={() => {
                            setTab('admins');
                            if (admins.length === 0) fetchAdmins();
                        }}
                        className={`text-xs font-semibold px-4 py-2 rounded-full transition-all ${
                            tab === 'admins'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        Administradores {admins.length > 0 ? `(${admins.length})` : ''}
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <input
                        type="text"
                        placeholder={tab === 'anunciantes' ? "Buscar por nome ou e-mail..." : "Buscar por e-mail..."}
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

                {tab === 'anunciantes' ? (
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
                                                <button onClick={() => handleVerOriginais(user.id, user.nome)} className="p-2 text-slate-300 hover:text-indigo-500 rounded-lg transition-all" title="Fotos Originais"><HiOutlinePhotograph size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtrados.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                                            Nenhum anunciante encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                                    <th className="px-6 py-4">Administrador</th>
                                    <th className="px-6 py-4 hidden md:table-cell">Perfil</th>
                                    <th className="px-6 py-4 hidden md:table-cell">Status</th>
                                    <th className="px-6 py-4 hidden md:table-cell">Criado em</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtradosAdmins.map((admin) => (
                                    <tr key={admin.id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-700">{admin.email}</div>
                                            <div className="text-[11px] text-slate-400">ID #{admin.id}</div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tight bg-indigo-50 text-indigo-600">
                                                Administrador
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tight bg-slate-100 text-slate-600">
                                                {admin.user_status || 'ativo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell text-xs text-slate-400">
                                            {admin.created_at ? new Date(admin.created_at).toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => { setSelectedUserId(admin.id); setIsPasswordModalOpen(true); }}
                                                    className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
                                                    title="Alterar Senha"
                                                >
                                                    <FaKey size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtradosAdmins.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                                            Nenhum administrador encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

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

            {isOriginaisModalOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-[3px] z-50 flex items-center justify-center p-4"
                    onClick={() => setIsOriginaisModalOpen(false)}
                >
                    <div
                        className="bg-white border border-slate-100 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold tracking-tight text-slate-800">Fotos Originais</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">{originaisNome}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {originaisData.length > 0 && (
                                    <button
                                        onClick={handleDownloadTodas}
                                        className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all"
                                    >
                                        <HiOutlineDownload size={14} />
                                        Baixar todas ({originaisData.length})
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOriginaisModalOpen(false)}
                                    className="p-1.5 text-slate-300 hover:text-slate-600 rounded-lg transition-all"
                                >
                                    <FaTimes size={13} />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto p-6 flex-1">
                            {originaisLoading && (
                                <div className="flex flex-col items-center justify-center h-48 gap-3">
                                    <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Carregando</p>
                                </div>
                            )}

                            {!originaisLoading && originaisData.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-48 gap-2">
                                    <HiOutlinePhotograph size={32} className="text-slate-200" />
                                    <p className="text-sm text-slate-400">Nenhuma foto original encontrada</p>
                                    <p className="text-[11px] text-slate-300">Fotos enviadas antes desta funcionalidade nao possuem original salvo</p>
                                </div>
                            )}

                            {!originaisLoading && originaisData.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {originaisData.map((foto) => {
                                        const filename = foto.url_original.split('/').pop() || `foto-${foto.id}.webp`;
                                        return (
                                            <div key={foto.id} className="group relative rounded-xl overflow-hidden bg-slate-50 border border-slate-100 aspect-square">
                                                <img
                                                    src={foto.url_original}
                                                    alt={`Foto original ${foto.id}`}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        const target = e.currentTarget;
                                                        target.style.display = 'none';
                                                        const parent = target.parentElement;
                                                        if (parent) {
                                                            const placeholder = document.createElement('div');
                                                            placeholder.className = 'flex items-center justify-center w-full h-full';
                                                            placeholder.innerHTML = '<span class="text-[10px] text-slate-300 text-center px-2">Original nao disponivel</span>';
                                                            parent.appendChild(placeholder);
                                                        }
                                                    }}
                                                />
                                                {/* Overlay de download no hover */}
                                                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-all flex items-center justify-center">
                                                    <button
                                                        onClick={() => handleDownloadFoto(foto.url_original, filename)}
                                                        className="opacity-0 group-hover:opacity-100 transition-all bg-white/90 hover:bg-white text-slate-700 p-2 rounded-lg shadow-md"
                                                        title="Baixar foto original"
                                                    >
                                                        <FaDownload size={12} />
                                                    </button>
                                                </div>
                                                {/* Numero da posicao */}
                                                <div className="absolute top-1.5 left-1.5 bg-slate-900/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                    #{foto.position + 1}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}