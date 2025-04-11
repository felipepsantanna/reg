import pool from './db';
import { hash, compare } from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Funções para usuários
export async function createUser(email: string, password: string) {
    const hashedPassword = await hash(password, 10);
    const [result] = await pool.execute(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [email, hashedPassword]
    ) as [ResultSetHeader, any];
    return result;
}

export async function getUserByEmail(email: string) {
    const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
    ) as [RowDataPacket[], any];
    return rows[0];
}

export async function verifyPassword(password: string, hashedPassword: string) {
    return await compare(password, hashedPassword);
}

// Funções para perfil do usuário
export async function saveUserProfile(userId: number, profileData: {
    nome: string;
    telefone: string;
    sexo: string;
    tamanho_dote?: string;
    idade: string;
    altura: string;
    peso: string;
    local_atendimento: string[];
    atende: string[];
    forma_pagamento: string[];
    redes_sociais: { tipo: string; url: string }[];
    descricao: string;
}) {
    const {
        nome,
        telefone,
        sexo,
        tamanho_dote,
        idade,
        altura,
        peso,
        local_atendimento,
        atende,
        forma_pagamento,
        redes_sociais,
        descricao
    } = profileData;

    const [result] = await pool.execute(
        'INSERT INTO user_profiles (user_id, nome, telefone, sexo, tamanho_dote, idade, altura, peso, local_atendimento, atende, forma_pagamento, redes_sociais, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            userId,
            nome,
            telefone,
            sexo,
            tamanho_dote,
            idade,
            altura,
            peso,
            JSON.stringify(local_atendimento),
            JSON.stringify(atende),
            JSON.stringify(forma_pagamento),
            JSON.stringify(redes_sociais),
            descricao
        ]
    );
    return result;
}

export async function getUserProfile(userId: number) {
    const [rows] = await pool.execute(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [userId]
    ) as [RowDataPacket[], any];
    return rows[0];
}

export async function updateUserProfile(userId: number, profileData: {
    nome: string;
    telefone: string;
    sexo: string;
    tamanho_dote?: string;
    idade: string;
    altura: string;
    peso: string;
    local_atendimento: string[];
    atende: string[];
    forma_pagamento: string[];
    redes_sociais: { tipo: string; url: string }[];
    descricao: string;
}) {
    const {
        nome,
        telefone,
        sexo,
        tamanho_dote,
        idade,
        altura,
        peso,
        local_atendimento,
        atende,
        forma_pagamento,
        redes_sociais,
        descricao
    } = profileData;

    const [result] = await pool.execute(
        'UPDATE user_profiles SET nome = ?, telefone = ?, sexo = ?, tamanho_dote = ?, idade = ?, altura = ?, peso = ?, local_atendimento = ?, atende = ?, forma_pagamento = ?, redes_sociais = ?, descricao = ? WHERE user_id = ?',
        [
            nome,
            telefone,
            sexo,
            tamanho_dote,
            idade,
            altura,
            peso,
            JSON.stringify(local_atendimento),
            JSON.stringify(atende),
            JSON.stringify(forma_pagamento),
            JSON.stringify(redes_sociais),
            descricao,
            userId
        ]
    );
    return result;
}

// Funções para mídias
export async function saveMedia(userId: number, type: 'image' | 'video', url: string, position: number) {
    const [result] = await pool.execute(
        'INSERT INTO media (user_id, type, url, position) VALUES (?, ?, ?, ?)',
        [userId, type, url, position]
    );
    return result;
}

export async function getMediaByUserId(userId: number) {
    const [rows] = await pool.execute(
        'SELECT * FROM media WHERE user_id = ? ORDER BY position',
        [userId]
    );
    return rows;
}

export async function updateMediaPositions(userId: number, mediaPositions: { id: number; position: number }[]) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        for (const { id, position } of mediaPositions) {
            await connection.execute(
                'UPDATE media SET position = ? WHERE id = ? AND user_id = ?',
                [position, id, userId]
            );
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Funções para configurações de layout
export async function saveLayoutConfig(userId: number, layoutType: string) {
    const [result] = await pool.execute(
        'INSERT INTO layout_config (user_id, layout_type) VALUES (?, ?)',
        [userId, layoutType]
    );
    return result;
}

export async function getLayoutConfig(userId: number) {
    const [rows] = await pool.execute(
        'SELECT * FROM layout_config WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
    ) as [RowDataPacket[], any];
    return rows[0];
} 