'use client';

import { useState, useEffect } from 'react';

interface UserProfileFormProps {
    onSave: (profileData: UserProfileData) => void;
}

export interface UserProfileData {
    nome: string;
    telefone: string;
    sexo: string;
    tamanho_dote?: string;
    idade: string;
    altura: string;
    peso: string;
    local_atendimento: string[];
    atende: string[];
    forma_pagamento: string[];
    redes_sociais: { tipo: string; url: string }[];
    descricao: string;
}

export default function UserProfileForm({ onSave }: UserProfileFormProps) {
    const [formData, setFormData] = useState<UserProfileData>({
        nome: '',
        telefone: '',
        sexo: '',
        tamanho_dote: '',
        idade: '',
        altura: '',
        peso: '',
        local_atendimento: [],
        atende: [],
        forma_pagamento: [],
        redes_sociais: [],
        descricao: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        // Carregar dados do perfil se existirem
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/user/profile');

                if (response.ok) {
                    const data = await response.json();
                    if (data.data) {
                        setFormData(data.data);
                    }
                }
            } catch (err) {
                console.error('Erro ao carregar perfil:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleArrayChange = (name: string, value: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            [name]: checked
                ? [...prev[name as keyof UserProfileData] as string[], value]
                : (prev[name as keyof UserProfileData] as string[]).filter(item => item !== value)
        }));
    };

    const handleRedeSocialChange = (index: number, field: 'tipo' | 'url', value: string) => {
        setFormData(prev => ({
            ...prev,
            redes_sociais: prev.redes_sociais.map((rede, i) =>
                i === index ? { ...rede, [field]: value } : rede
            )
        }));
    };

    const addRedeSocial = () => {
        setFormData(prev => ({
            ...prev,
            redes_sociais: [...prev.redes_sociais, { tipo: '', url: '' }]
        }));
    };

    const removeRedeSocial = (index: number) => {
        setFormData(prev => ({
            ...prev,
            redes_sociais: prev.redes_sociais.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);
            setError('');
            setSuccess('');

            const response = await fetch('/api/user/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao salvar perfil');
            }

            setSuccess('Perfil salvo com sucesso!');
            onSave(formData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao salvar perfil');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Dados de Cadastro</h2>

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

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                            Nome Completo
                        </label>
                        <input
                            type="text"
                            id="nome"
                            name="nome"
                            value={formData.nome}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone
                        </label>
                        <input
                            type="tel"
                            id="telefone"
                            name="telefone"
                            value={formData.telefone}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label htmlFor="sexo" className="block text-sm font-medium text-gray-700 mb-1">
                            Sexo
                        </label>
                        <select
                            id="sexo"
                            name="sexo"
                            value={formData.sexo}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Selecione</option>
                            <option value="feminino">Feminino</option>
                            <option value="masculino">Masculino</option>
                            <option value="trans">Trans</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="idade" className="block text-sm font-medium text-gray-700 mb-1">
                            Idade
                        </label>
                        <input
                            type="number"
                            id="idade"
                            name="idade"
                            value={formData.idade}
                            onChange={handleChange}
                            required
                            min="18"
                            max="99"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="tamanho_dote" className="block text-sm font-medium text-gray-700 mb-1">
                            Tamanho do Dote
                        </label>
                        <input
                            type="text"
                            id="tamanho_dote"
                            name="tamanho_dote"
                            value={formData.tamanho_dote}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="altura" className="block text-sm font-medium text-gray-700 mb-1">
                            Altura
                        </label>
                        <input
                            type="text"
                            id="altura"
                            name="altura"
                            value={formData.altura}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="peso" className="block text-sm font-medium text-gray-700 mb-1">
                            Peso
                        </label>
                        <input
                            type="text"
                            id="peso"
                            name="peso"
                            value={formData.peso}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Local de Atendimento
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Motel', 'Hotel', 'Casa', 'Apartamento'].map(local => (
                            <label key={local} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={formData.local_atendimento.includes(local)}
                                    onChange={(e) => handleArrayChange('local_atendimento', local, e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{local}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Atende
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Homens', 'Mulheres', 'Casal', 'Trans'].map(tipo => (
                            <label key={tipo} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={formData.atende.includes(tipo)}
                                    onChange={(e) => handleArrayChange('atende', tipo, e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{tipo}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Forma de Pagamento
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Dinheiro', 'PIX', 'Cartão', 'Transferência'].map(forma => (
                            <label key={forma} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={formData.forma_pagamento.includes(forma)}
                                    onChange={(e) => handleArrayChange('forma_pagamento', forma, e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{forma}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Redes Sociais
                    </label>
                    {formData.redes_sociais.map((rede, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                            <select
                                value={rede.tipo}
                                onChange={(e) => handleRedeSocialChange(index, 'tipo', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Selecione</option>
                                <option value="instagram">Instagram</option>
                                <option value="twitter">Twitter</option>
                                <option value="facebook">Facebook</option>
                                <option value="tiktok">TikTok</option>
                            </select>
                            <input
                                type="url"
                                value={rede.url}
                                onChange={(e) => handleRedeSocialChange(index, 'url', e.target.value)}
                                placeholder="URL"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => removeRedeSocial(index)}
                                className="px-3 py-2 text-red-600 hover:text-red-800"
                            >
                                Remover
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addRedeSocial}
                        className="mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                        + Adicionar Rede Social
                    </button>
                </div>

                <div className="mb-6">
                    <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição
                    </label>
                    <textarea
                        id="descricao"
                        name="descricao"
                        value={formData.descricao}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : 'Salvar Dados'}
                    </button>
                </div>
            </form>
        </div>
    );
} 