'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FaLock, FaEye, FaEyeSlash, FaShieldAlt } from 'react-icons/fa';

interface SecurityTabProps {
    viewAs?: string | null;
}

export const SecurityTab = ({ viewAs }: SecurityTabProps) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error('A senha deve ter no mínimo 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Atualizando senha...');

        try {
            const res = await fetch('/api/user/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    confirmPassword,
                    viewAs: viewAs || undefined
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao atualizar senha');
            }

            toast.success('Senha atualizada com sucesso!', { id: toastId });
            setPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Erro ao atualizar senha:', error);
            toast.error(error.message || 'Erro ao atualizar senha', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl">
                    <FaShieldAlt size={22} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Segurança da Conta</h2>
                    <p className="text-sm text-gray-500 font-medium">Defina sua nova senha de acesso ao painel</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="text-xs font-black uppercase tracking-wider text-gray-400 ml-1">
                        Nova Senha
                    </label>
                    <div className="relative mt-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                            <FaLock size={15} />
                        </div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo de 6 caracteres"
                            required
                            minLength={6}
                            className="w-full pl-11 pr-12 p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                            tabIndex={-1}
                            title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                        >
                            {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-black uppercase tracking-wider text-gray-400 ml-1">
                        Confirmar Nova Senha
                    </label>
                    <div className="relative mt-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                            <FaLock size={15} />
                        </div>
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repita a nova senha"
                            required
                            minLength={6}
                            className="w-full pl-11 pr-12 p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                            tabIndex={-1}
                            title={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
                        >
                            {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-700">Dica de segurança:</p>
                    <p>Crie uma senha forte com pelo menos 6 caracteres combinando letras e números.</p>
                </div>

                <button
                    type="submit"
                    disabled={loading || !password || password.length < 6}
                    className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98]"
                >
                    {loading ? 'ATUALIZANDO...' : 'ATUALIZAR SENHA'}
                </button>
            </form>
        </div>
    );
};
