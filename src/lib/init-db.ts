import fs from 'fs';
import path from 'path';
import pool from './db';

async function initDb() {
    try {
        console.log('Inicializando banco de dados...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Divide o script SQL em comandos individuais
        const statements = schemaSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
            await pool.execute(statement);
        }

        console.log('Banco de dados inicializado com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        process.exit(1);
    }
}

initDb();
