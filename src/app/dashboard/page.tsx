// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileTab } from '@/components/dashboard/ProfileTab';
import { PhotosTab } from '@/components/dashboard/PhotosTab';
import { VideosTab } from '@/components/dashboard/VideosTab';
import { RegistrationSuccess } from '@/components/RegistrationSuccess';
import { UserProfileData } from '@/types/UserProfileData';
import { MediaItem } from '@/types/MediaItem';
import { FaSignOutAlt, FaUser, FaCamera, FaVideo } from 'react-icons/fa';

export default function DashboardPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'profile' | 'photos' | 'videos'>('profile');
    const [userData, setUserData] = useState<UserProfileData>({
        nome: '', sexo: '', idade: '', telefone: '', descricao: '',
        photos: [], videos: []
    });
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const [profileRes, mediaRes] = await Promise.all([
                    fetch('/api/user/profile'),
                    fetch('/api/user/media')
                ]);
                const profileJson = await profileRes.json();
                const mediaJson = await mediaRes.json();
                const allMedia: MediaItem[] = mediaJson.media || [];

                setUserData({
                    ...(profileJson.data || { nome: '', sexo: '', idade: '' }),
                    photos: allMedia.filter(m => m.type === 'image').sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0)),
                    videos: allMedia.filter(m => m.type === 'video').sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
                });
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchDashboardData();
    }, []);

    const handleLogout = async () => {
        try {
            const res = await fetch('/api/auth/logout', { method: 'POST' });
            if (res.ok) router.push('/login');
        } catch (error) {
            console.error('Falha ao deslogar:', error);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveLoading(true);
        try {
            await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: userData.nome,
                    idade: userData.idade,
                    sexo: userData.sexo
                }),
            });
            alert('Perfil atualizado!');
        } finally {
            setSaveLoading(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
            <div className="text-indigo-600 font-bold animate-pulse">Carregando painel...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">

            {/* Sidebar / Header */}
            <aside className="w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r p-4 lg:p-6 flex flex-row lg:flex-col items-center lg:items-stretch justify-between lg:justify-start gap-4 shadow-sm z-10">

                {/* Logo - Largura fixa no mobile para não empurrar as abas */}
                <div className="lg:mb-10 lg:px-4 shrink-0 w-auto lg:w-full">
                    <h1 className="text-base lg:text-xl font-black text-gray-800 tracking-tighter uppercase leading-none">
                        Capital <span className="text-indigo-600 lg:block">Sexy</span>
                    </h1>
                </div>

                {/* Menu de Abas - Centralizado e Flexível */}
                <nav className="flex flex-row lg:flex-col gap-1 lg:gap-2 flex-1 justify-center lg:justify-start overflow-x-auto no-scrollbar px-2">
                    <TabButton
                        label="Perfil"
                        icon={<FaUser size={14} />}
                        active={activeTab === 'profile'}
                        onClick={() => setActiveTab('profile')}
                    />
                    <TabButton
                        label="Fotos"
                        icon={<FaCamera size={14} />}
                        active={activeTab === 'photos'}
                        onClick={() => setActiveTab('photos')}
                    />
                    <TabButton
                        label="Vídeos"
                        icon={<FaVideo size={14} />}
                        active={activeTab === 'videos'}
                        onClick={() => setActiveTab('videos')}
                    />
                </nav>

                {/* Logout - Alinhado à direita no mobile */}
                <button
                    onClick={handleLogout}
                    className="shrink-0 flex items-center gap-2 p-2 lg:p-4 text-gray-400 hover:text-red-500 font-bold rounded-xl transition-all lg:mt-auto"
                >
                    <FaSignOutAlt className="text-lg" />
                    <span className="hidden sm:inline lg:inline">Sair</span>
                </button>
            </aside>

            {/* Conteúdo Principal */}
            <main className="flex-1 p-4 lg:p-10 overflow-y-auto">
                <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                    <div className="lg:col-span-2 space-y-6">
                        {activeTab === 'profile' && (
                            <ProfileTab
                                data={userData}
                                onChange={(e) => setUserData({ ...userData, [e.target.name]: e.target.value })}
                                onSave={handleSaveProfile}
                                loading={saveLoading}
                            />
                        )}

                        {activeTab === 'photos' && (
                            <PhotosTab initialPhotos={userData.photos} />
                        )}

                        {activeTab === 'videos' && (
                            <VideosTab initialVideos={userData.videos} />
                        )}
                    </div>

                    <aside className="lg:col-span-1">
                        <div className="sticky top-10">
                            <RegistrationSuccess userName={userData.nome || 'Anunciante'} />
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}

function TabButton({ label, active, onClick, icon }: { label: string, active: boolean, onClick: () => void, icon: any }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center lg:justify-start gap-2 lg:gap-3 px-3 py-2 lg:p-4 rounded-xl lg:rounded-2xl font-bold transition-all whitespace-nowrap ${active
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                : 'text-gray-400 hover:bg-gray-50'
                }`}
        >
            <span className="shrink-0">{icon}</span>
            <span className="text-xs lg:text-base">{label}</span>
        </button>
    );
}