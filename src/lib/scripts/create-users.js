const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createUsers() {
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