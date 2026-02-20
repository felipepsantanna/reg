export interface MediaItem {
    id: string | number;
    url: string;
    thumbnail: string;
    type: 'image' | 'video'; // Campo importante para o filtro
    position: number;
}