import { RowDataPacket } from 'mysql2';

export interface UserRow extends RowDataPacket {
    id: number;
    name: string;
    email: string;
    role: string;
    user_status: string;
    created_at: string;
    updated_at: string;
    phone: string | null;
    city: string | null;
    state: string | null;
    birth_date: string | null;
    gender: string | null;
    occupation: string | null;
    relationship_status: string | null;
    bio: string | null;
    instagram: string | null;
    facebook: string | null;
    twitter: string | null;
    tiktok: string | null;
    youtube: string | null;
    website: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    media_count: number;
    photo_count: number;
    video_count: number;
    status: 'pending' | 'approved' | 'rejected';
    updates: number;
}

export interface ProfileRow extends RowDataPacket {
    id: number;
    user_id: number;
    nome: string;
    telefone: string;
    sexo: string;
    tamanhoDote?: string;
    idade?: number | string | null;
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

export interface AuditLogsRow extends RowDataPacket{
    id: number;
    userId: number;
    field: string;
    oldValue: string;
    newValue: string;
    updatedAt: Date;
    reviewed: number;
}