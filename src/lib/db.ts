import mysql from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';

interface UserRow extends RowDataPacket {
    id: string;
    email: string;
    password: string;
    role: 'admin' | 'anunciante';
}

interface AnuncianteUser extends UserRow {
    status: string;
    tipo: string;
    telefone: string;
    dataCadastro: Date;
    ultimaAtualizacao: Date;
}


const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export default pool;

// Simulação de banco de dados
export const users: UserRow[] = [];

// Função para buscar usuário por email
export async function findUserByEmail(email: string): Promise<UserRow | null> {
    const [rows] = await pool.execute<UserRow[]>(
        'SELECT * FROM users WHERE email = ?',
        [email]
    );
    return rows[0] || null;
}

// Função para buscar usuário por ID
export function findUserById(id: string): UserRow | undefined {
    return users.find(user => user.id === id);
}

// Função para buscar todos os usuários anunciantes
export function findAllAnunciantes(): AnuncianteUser[] {
    return users.filter(user => user.role === 'anunciante') as AnuncianteUser[];
}

// Função para atualizar o status de um usuário anunciante
export function updateAnuncianteStatus(id: string, status: 'ativo' | 'inativo'): boolean {
    const user = findUserById(id);
    if (user && user.role === 'anunciante') {
        (user as AnuncianteUser).status = status;
        (user as AnuncianteUser).ultimaAtualizacao = new Date();
        return true;
    }
    return false;
}

// Salvar token de redefinição de senha
export async function savePasswordResetToken(email: string, token: string, expiry: Date): Promise<boolean> {
    const [result] = await pool.execute(
        'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
        [token, expiry, email]
    );
    return (result as any).affectedRows > 0;
}

// Buscar usuário com token válido (e não expirado)
export async function findUserByResetToken(token: string): Promise<UserRow | null> {
    const [rows] = await pool.execute<UserRow[]>(
        'SELECT id, email, role, status FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
        [token]
    );
    return rows[0] || null;
}

// Atualizar senha e invalidar token
export async function updateUserPasswordAndClearToken(userId: number | string, newPasswordHash: string): Promise<boolean> {
    const [result] = await pool.execute(
        'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
        [newPasswordHash, userId]
    );
    return (result as any).affectedRows > 0;
}