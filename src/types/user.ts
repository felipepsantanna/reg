export type UserRole = 'admin' | 'anunciante';

export interface User {
    id: number;
    email: string;
    password: string;
    role: 'admin' | 'anunciante';
    nome?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface AdminUser extends User {
    role: 'admin';
}

export interface AnuncianteUser extends User {
    role: 'anunciante';
    status: 'ativo' | 'inativo';
    tipo: 'acompanhante' | 'cliente';
    telefone: string;
    dataCadastro: Date;
    ultimaAtualizacao: Date;
} 