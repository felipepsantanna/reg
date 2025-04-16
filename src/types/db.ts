import { RowDataPacket } from 'mysql2';

export interface UserRow extends RowDataPacket {
    id: number;
    name: string;
    email: string;
    role: string;
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
} 