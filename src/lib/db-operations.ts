import pool from './db';
import { hash, compare } from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcryptjs';

type FieldChange = {
    field: string;
    oldValue: string | null;
    newValue: string | null;
};

// Funções para usuários
export async function createUser(
    email: string,
    password: string,
    role: 'admin' | 'anunciante' = 'anunciante',
    status: 'ativo' | 'inativo' | 'primeiro acesso' = 'ativo'
) {
    const hashedPassword = await hash(password, 10);
    const [result] = await pool.execute(
        'INSERT INTO users (email, password, role, status) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, role, status]
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
export async function getUserById(id: number) {
    const [rows] = await pool.execute(
        'SELECT id, email, role, status, created_at, updated_at FROM users WHERE id = ?',
        [id]
    ) as [RowDataPacket[], any];
    return rows[0] || null;
}
export async function verifyPassword(password: string, hashedPassword: string) {
    return await compare(password, hashedPassword);
}
export async function saveUserProfile(userId: number, profileData: {
    nome: string;
    sexo: string;
    idade: string;
    status?: string;
}) {
    const {
        nome,
        sexo,
        idade,
        status = 'pending'
    } = profileData;

    const [result] = await pool.execute(
        'INSERT INTO user_profiles (user_id, nome, sexo, idade, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [
            userId,
            nome,
            sexo,
            idade,
            status
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
    sexo: string;
    idade: string;
}) {
    const { nome, sexo, idade } = profileData;

    const [result] = await pool.execute(
        'UPDATE user_profiles SET nome = ?, sexo = ?, idade = ?, updated_at = NOW() WHERE user_id = ?',
        [
            nome,
            sexo,
            idade,
            userId
        ]
    ) as [ResultSetHeader, any];

    return result;
}
export async function updateUserProfilesUpdatedAt(userId: number) {
    await pool.execute(
        'UPDATE user_profiles SET updated_at = current_timestamp WHERE user_id = ?',
        [
            userId
        ]
    ) as [ResultSetHeader, any];

    await pool.execute(
        'UPDATE users SET updated_at = current_timestamp WHERE id= ?',
        [
            userId
        ]
    ) as [ResultSetHeader, any];

    return;
}
// Funções para mídias
export async function saveMedia(userId: number, type: 'image' | 'video', thumbnail: string, url: string, position: number) {
    const [result] = await pool.execute(
        'INSERT INTO media (user_id, type, thumbnail, url, position) VALUES (?, ?, ?, ?, ?)',
        [userId, type, thumbnail, url, position]
    ) as [ResultSetHeader, any];
    return result;
}
export async function getMediaByUserId(userId: number) {
    const [rows] = await pool.execute(
        'SELECT * FROM media WHERE user_id = ? ORDER BY position',
        [userId]
    );
    return rows;
}
export async function getMediaById(id: number) {
    const [rows] = await pool.execute(
        'SELECT * FROM media WHERE id = ?',
        [id]
    ) as [RowDataPacket[], any];
    return rows[0];
}

export async function deleteMediaById(id: number) {
    const [result] = await pool.execute(
        'DELETE FROM media WHERE id = ?',
        [id]
    ) as [any, any];

    return result;
}

export async function getMediaByIds(ids: number[]) {
    if (!ids || ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.query(
        `SELECT * FROM media WHERE id IN (${placeholders})`,
        ids
    ) as [RowDataPacket[], any];
    return rows;
}

export async function deleteMediaByIds(ids: number[], userId?: number) {
    if (!ids || ids.length === 0) return { affectedRows: 0 };
    const placeholders = ids.map(() => '?').join(',');
    if (userId !== undefined) {
        const [result] = await pool.query(
            `DELETE FROM media WHERE id IN (${placeholders}) AND user_id = ?`,
            [...ids, userId]
        ) as [any, any];
        return result;
    } else {
        const [result] = await pool.query(
            `DELETE FROM media WHERE id IN (${placeholders})`,
            ids
        ) as [any, any];
        return result;
    }
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
interface UserRow extends RowDataPacket {
    id: number;
    email: string;
    password: string;
    role: 'admin' | 'anunciante';
}
export async function getUser(email: string, password: string) {
    // Validar campos obrigatórios
    if (!email || !password) {
        return null;
    }

    try {
        // Buscar usuário no banco de dados
        const [rows] = await pool.execute<UserRow[]>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        const user = rows[0];
        if (!user) {
            return null;
        }

        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return null;
        }

        // Retornar dados do usuário sem a senha
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status
        };
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        return null;
    }
}
export async function saveAuditLogs(
    userId: number,
    changes: FieldChange[],
): Promise<void> {
    const query = `
    INSERT INTO audit_logs (userId, field, oldValue, newValue, updatedAt, reviewed)
    VALUES (?, ?, ?, ?, NOW(), false)
  `;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        for (const change of changes) {
            await connection.execute(query, [
                userId,
                change.field,
                change.oldValue,
                change.newValue,
            ]);
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao salvar logs de auditoria:', error);
        throw error;
    } finally {
        connection.release();
    }
}
export async function getAuditLogs(userId: number) {
    const [rows] = await pool.execute(
        'SELECT * FROM audit_logs WHERE userid = ?',
        [userId]
    ) as [RowDataPacket[], any];
    return rows;
}
export async function saveUserFirstAccess(userId: number,) {
    const [result] = await pool.execute(
        'update users set status = ? where id = ?',
        ['ativo', userId]
    ) as [ResultSetHeader, any];
    return result;
}