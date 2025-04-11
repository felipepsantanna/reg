import fs from 'fs';
import path from 'path';
import pool from './db';

async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();

        // Ler o arquivo schema.sql
        const schemaPath = path.join(process.cwd(), 'src', 'lib', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Executar os comandos SQL
        await connection.query(schema);

        console.log('Banco de dados inicializado com sucesso!');
        connection.release();
    } catch (error) {
        console.error('Erro ao inicializar o banco de dados:', error);
        process.exit(1);
    }
}

// Executar a inicialização
initializeDatabase(); 