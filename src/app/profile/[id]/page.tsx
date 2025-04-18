'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Profile {
    id: number;
    user_id: number;
    nome: string;
    telefone: string;
    sexo: string;
    tamanhoDote?: string;
    idade: number;
    altura: number;
    peso: number;
    localAtendimento: string;
    atende: string;
    formaPagamento: string;
    descricao: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: Date;
    updated_at: Date;
    email: string;
}

interface MediaItem {
    id: string;
    type: 'image' | 'video';
    url: string;
    thumbnail: string;
    position: number;
    poster?: string;
}

export default function ProfilePage({ params }: { params: { id: string } }) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProfile();
        fetchMedia();
    }, [params.id]);

    const fetchProfile = async () => {
        try {
            const response = await fetch(`/api/profiles/${params.id}`);
            if (!response.ok) {
                throw new Error('Erro ao buscar perfil');
            }
            const data = await response.json();
            setProfile(data);
        } catch (error) {
            setError('Erro ao carregar perfil');
            console.error(error);
        }
    };

    const fetchMedia = async () => {
        try {
            const response = await fetch(`/api/profiles/${params.id}/media`);
            if (!response.ok) {
                throw new Error('Erro ao buscar mídias');
            }
            const { data } = await response.json();

            setMediaItems(data);
        } catch (error) {
            console.error('Erro ao carregar mídias:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center">Carregando...</div>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center text-red-600">{error || 'Perfil não encontrado'}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Cabeçalho */}
                    <div className="p-6 border-b">
                        <h1 className="text-3xl font-bold text-gray-900">{profile.nome}</h1>
                        <p className="text-gray-600 mt-2">Última atualização: {format(new Date(profile.updated_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                    </div>

                    {/* Informações Básicas */}
                    <div className="p-6 grid grid-cols-2 gap-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Informações Básicas</h2>
                            <div className="space-y-3">
                                <div>
                                    <span className="font-medium">Idade:</span>
                                    <span className="ml-2">{profile.idade} anos</span>
                                </div>
                                <div>
                                    <span className="font-medium">Altura:</span>
                                    <span className="ml-2">{profile.altura}cm</span>
                                </div>
                                <div>
                                    <span className="font-medium">Peso:</span>
                                    <span className="ml-2">{profile.peso}kg</span>
                                </div>
                                <div>
                                    <span className="font-medium">Sexo:</span>
                                    <span className="ml-2">{profile.sexo}</span>
                                </div>
                                {profile.tamanhoDote && (
                                    <div>
                                        <span className="font-medium">Tamanho do Dote:</span>
                                        <span className="ml-2">{profile.tamanhoDote}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold mb-4">Contato</h2>
                            <div className="space-y-3">
                                <div>
                                    <span className="font-medium">Telefone:</span>
                                    <span className="ml-2">{profile.telefone}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Locais e Serviços */}
                    <div className="p-6 border-t">
                        <h2 className="text-xl font-semibold mb-4">Locais e Serviços</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-medium mb-2">Locais de Atendimento</h3>
                                <p className="text-gray-600">{profile.localAtendimento}</p>
                            </div>
                            <div>
                                <h3 className="font-medium mb-2">Atende</h3>
                                <p className="text-gray-600">{profile.atende}</p>
                            </div>
                            <div>
                                <h3 className="font-medium mb-2">Formas de Pagamento</h3>
                                <p className="text-gray-600">{profile.formaPagamento}</p>
                            </div>
                        </div>
                    </div>

                    {/* Descrição */}
                    <div className="p-6 border-t">
                        <h2 className="text-xl font-semibold mb-4">Descrição</h2>
                        <p className="text-gray-600 whitespace-pre-line">{profile.descricao}</p>
                    </div>

                    {/* Galeria de Mídia */}
                    {mediaItems.length > 0 && (
                        <div className="p-6 border-t">
                            <h2 className="text-xl font-semibold mb-4">Galeria</h2>
                            <div className="">
                                {mediaItems.map(item => (
                                    <div key={item.id} className="w-full h-full">
                                        {item.type === 'image' ? (
                                            <img
                                                src={item.url}
                                                alt=""
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                        ) : (
                                            <div><br />
                                                <iframe
                                                    src={`https://iframe.mediadelivery.net/embed/299184/${item.url}?autoplay=true&loop=false&muted=false&preload=false&responsive=true`}

                                                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                                                    allowFullScreen={true}
                                                    className="w-full h-full"
                                                >
                                                </iframe>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
} 