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