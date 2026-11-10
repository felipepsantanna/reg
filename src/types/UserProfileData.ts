import { MediaItem } from './MediaItem'; // Caminho relativo para o arquivo acima
export interface UserProfileData {
    nome: string;
    telefone: string;
    sexo: string;
    classe_especial?: 'sim' | 'nao' | string;
    idade?: string;
    descricao: string;
    email?: string;
    photos: MediaItem[];
    videos: MediaItem[];
}