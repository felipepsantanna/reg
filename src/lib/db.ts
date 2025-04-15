import mysql from 'mysql2/promise';
import { AdminUser, AnuncianteUser, User } from '@/types/user';
import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface UserRow extends RowDataPacket {
    id: number;
    email: string;
    password: string;
    role: 'admin' | 'anunciante';
}

interface CountRow extends RowDataPacket {
    count: number;
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
export const users: User[] = [];

// Função para inicializar o banco de dados com usuários de teste
export async function initializeDB() {
    // Verificar se já existem usuários
    const [rows] = await pool.execute<CountRow[]>('SELECT COUNT(*) as count FROM users');
    if (rows[0].count > 0) return;

    // Criar usuários iniciais se não existirem
    const adminPassword = await bcrypt.hash('adm123', 10);
    const anunciantePassword = await bcrypt.hash('ad0123', 10);

    await pool.execute(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        ['admin@admin.com.br', adminPassword, 'admin']
    );

    await pool.execute(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        ['ad@ad.com.br', anunciantePassword, 'anunciante']
    );
}

// Função para buscar usuário por email
export async function findUserByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.execute<UserRow[]>(
        'SELECT * FROM users WHERE email = ?',
        [email]
    );
    return rows[0] || null;
}

// Função para buscar usuário por ID
export function findUserById(id: string): User | undefined {
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