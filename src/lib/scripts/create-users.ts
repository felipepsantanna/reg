import bcrypt from 'bcryptjs';
import pool from '../db';

async function createUsers() {
    try {
        // Gerar hashes das senhas
        const adminPassword = await bcrypt.hash('adm123', 10);
        const anunciantePassword = await bcrypt.hash('ad0123', 10);

        // Inserir usuário admin
        await pool.execute(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            ['admin@admin.com.br', adminPassword, 'admin']
        );

        // Inserir usuário anunciante
        await pool.execute(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            ['ad@ad.com.br', anunciantePassword, 'anunciante']
        );

        console.log('Usuários criados com sucesso!');
    } catch (error) {
        console.error('Erro ao criar usuários:', error);
    } finally {
        await pool.end();
    }
}

createUsers(); 