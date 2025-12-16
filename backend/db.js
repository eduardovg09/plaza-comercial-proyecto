require('dotenv').config(); // 1. Cargar librería para leer .env
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,      // Lee del entorno
    password: process.env.DB_PASS,  // Lee del entorno
    server: process.env.DB_SERVER,  // Lee del entorno
    database: process.env.DB_NAME,  // Lee del entorno
    options: {
        encrypt: true, // OBLIGATORIO para Azure SQL
        trustServerCertificate: true // Acepta certificados (útil para evitar errores)
    }
};

async function getConnection() {
    try {
        const pool = await sql.connect(config);
        console.log("Conexión a BD exitosa");
        return pool;
    } catch (err) {
        console.error('Error conectando a SQL Server:', err);
        throw err;
    }
}

module.exports = { getConnection, sql };