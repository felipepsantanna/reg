import { MediaItem } from './MediaItem'; // Caminho relativo para o arquivo acima
export interface UserProfileData {
    nome: string;
    telefone: string;
    sexo: string;
    idade?: string;
    descricao: string;
    email?: string;
    photos: MediaItem[];
    videos: MediaItem[];
}