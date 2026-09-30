'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProfileTab } from '@/components/dashboard/ProfileTab';
import { PhotosTab } from '@/components/dashboard/PhotosTab';
import { VideosTab } from '@/components/dashboard/VideosTab';
import { RegistrationSuccess } from '@/components/RegistrationSuccess';
import { UserProfileData } from '@/types/UserProfileData';
import { MediaItem } from '@/types/MediaItem';
import { FaSignOutAlt, FaGem, FaArrowLeft } from 'react-icons/fa';
import { Toaster } from 'sonner';

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const viewAs = searchParams.get('viewAs');
    const query = viewAs ? `?viewAs=${encodeURIComponent(viewAs)}` : '';

    const [activeTab, setActiveTab] = useState<'profile' | 'photos' | 'videos'>('profile');
    const [userData, setUserData] = useState<UserProfileData>({
        nome: '', sexo: '', idade: '', telefone: '', descricao: '', email: '',
        photos: [], videos: []
    });
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const [profileRes, mediaRes] = await Promise.all([
                    fetch(`/api/user/profile${query}`),
                    fetch(`/api/user/media${query}`)
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
    }, [query]);

    const handleLogout = async () => {
        if (viewAs) {
            router.push('/admin');
            return;
        }
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
            await fetch(`/api/user/profile${query}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: userData.nome,
                    idade: userData.idade,
                    sexo: userData.sexo,
                    telefone: userData.telefone,
                    descricao: userData.descricao,
                    viewAs: viewAs || undefined
                }),
            });
            alert('Perfil atualizado!');
        } finally {
            setSaveLoading(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
            <div className="text-indigo-600 font-bold animate-pulse text-xl">Carregando painel...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            <Toaster position="bottom-center" richColors />
            {viewAs && (
                <div className="bg-indigo-900 text-white text-xs py-2 px-4 fixed top-0 left-0 right-0 z-[60] shadow-sm">
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 font-medium">
                            <span className="bg-indigo-600 text-white font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                                Modo Admin
                            </span>
                            <span>
                                Visualizando dashboard do usuário <strong>#{viewAs}</strong>
                            </span>
                        </div>
                        <button
                            onClick={() => router.push('/admin')}
                            className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1 rounded-lg transition-all text-xs flex items-center gap-1.5"
                        >
                            <FaArrowLeft size={10} />
                            Voltar ao Painel Admin
                        </button>
                    </div>
                </div>
            )}

            <header className={`fixed ${viewAs ? 'top-8' : 'top-0'} left-0 right-0 h-20 bg-white border-b border-gray-100 z-50 px-4 md:px-8 shadow-sm transition-all`}>
                <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="bg-indigo-600 p-2 rounded-lg text-white">
                            <FaGem size={18} />
                        </div>
                        <h1 className="text-lg font-black text-gray-800 tracking-tighter uppercase hidden sm:block">
                            Capital <span className="text-indigo-600">Sexy</span>
                        </h1>
                    </div>

                    <nav className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-2xl">
                        <TabButton label="Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
                        <TabButton label="Fotos" active={activeTab === 'photos'} onClick={() => setActiveTab('photos')} />
                        <TabButton label="Vídeos" active={activeTab === 'videos'} onClick={() => setActiveTab('videos')} />
                    </nav>

                    <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-500 font-bold text-sm transition-all shrink-0">
                        <FaSignOutAlt />
                        <span className="hidden md:inline">{viewAs ? 'Voltar' : 'Sair'}</span>
                    </button>
                </div>
            </header>

            <main className={`flex-1 ${viewAs ? 'pt-32' : 'pt-24'} pb-12 px-4 md:px-8`}>
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
                            <ProfileTab
                                data={userData}
                                onChange={(e) => setUserData({ ...userData, [e.target.name]: e.target.value })}
                                onSave={handleSaveProfile}
                                loading={saveLoading}
                            />
                        </div>
                        <div className={activeTab === 'photos' ? 'block' : 'hidden'}>
                            <PhotosTab initialPhotos={userData.photos} viewAs={viewAs} />
                        </div>
                        <div className={activeTab === 'videos' ? 'block' : 'hidden'}>
                            <VideosTab initialVideos={userData.videos} viewAs={viewAs} />
                        </div>
                    </div>

                    <aside className="lg:col-span-1">
                        <div className="sticky top-24">
                            <RegistrationSuccess
                                userName={userData.nome || 'Anunciante'}
                                userEmail={userData.email}
                            />
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
                <div className="text-indigo-600 font-bold animate-pulse text-xl">Carregando painel...</div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}

function TabButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm whitespace-nowrap ${active ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
        >
            {label}
        </button>
    );
}