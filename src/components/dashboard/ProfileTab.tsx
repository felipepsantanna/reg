// @/components/dashboard/ProfileTab.tsx
import { UserProfileData } from '@/types/UserProfileData';

interface ProfileTabProps {
    data: UserProfileData;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onSave: (e: React.FormEvent) => void;
    loading: boolean;
}

export const ProfileTab = ({ data, onChange, onSave, loading }: ProfileTabProps) => (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <h2 className="text-2xl font-black mb-6 text-gray-800">Informações Básicas</h2>

        <form onSubmit={onSave} className="space-y-6">
            <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-400 ml-1">Nome Artístico</label>
                <input
                    name="nome"
                    placeholder="Como você quer ser chamada?"
                    value={data.nome || ''}
                    onChange={onChange}
                    required
                    className="w-full p-4 bg-gray-50 rounded-2xl mt-1 border border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                />
            </div>

            {data.idade ? (
                <input type="hidden" name="idade" value={data.idade} />
            ) : null}

            <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-400 ml-1">Gênero</label>
                <select
                    name="sexo"
                    value={data.sexo || ''}
                    onChange={onChange}
                    required
                    className="w-full p-4 bg-gray-50 rounded-2xl mt-1 border border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium appearance-none cursor-pointer"
                >
                    <option value="">Selecione</option>
                    <option value="feminino">Feminino</option>
                    <option value="masculino">Masculino</option>
                    <option value="trans">Trans</option>
                </select>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98]"
            >
                {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
            </button>
        </form>
    </div>
);