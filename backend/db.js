const sql = require('mssql');

const config = {
    user: 'progDB',      // El usuario que acabamos de crear
    password: 'Tese01',        // La contraseña que pusimos
    server: 'PC-LALO\\SQLEXPRESS',
    database: 'PlazaComercialDB',
    options: {
        encrypt: false, // Importante para local
        trustServerCertificate: true // Aceptar certificados locales
    }
};

async function getConnection() {
    try {
        const pool = await sql.connect(config);
        //console.log("✅ ¡Conexión exitosa a SQL Server (Vía TCP)!");
        return pool;
    } catch (err) {
        console.error('❌ Error conectando a SQL Server:', err);
        throw err;
    }
}

module.exports = { getConnection, sql };