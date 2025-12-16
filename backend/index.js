const express = require('express');
const cors = require('cors');
const { getConnection } = require('./db');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const bcrypt = require('bcryptjs'); // <--- NUEVO
const jwt = require('jsonwebtoken'); // <--- NUEVO

const SECRET_KEY = 'mi_secreto_super_seguro'; // En producción esto va en .env

app.use(cors());
app.use(express.json());

// Configuración de correo (Asegúrate de poner tus datos reales aquí)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'johan34mmq@gmail.com',
        pass: 'safa qqzp jdiu esoo'
    }
});

// --- RUTAS DE AUTENTICACIÓN ---

// 1. RUTA DE AYUDA: Crear o Actualizar Admin con Hash Real
// (Úsala una vez para arreglar la contraseña de tu admin actual)
app.post('/api/auth/setup-admin', async (req, res) => {
    console.log("👉 1. Petición recibida en setup-admin"); // Log 1

    try {
        const { email, password } = req.body;
        console.log("👉 2. Datos recibidos:", email); // Log 2

        const pool = await getConnection();
        console.log("👉 3. Conexión a BD obtenida"); // Log 3

        // ENCRIPTAMOS
        console.log("👉 4. Iniciando encriptación...");
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        console.log("👉 5. Contraseña encriptada exitosamente"); // Log 4

        // ACTUALIZAMOS
        console.log("👉 6. Ejecutando Update en SQL...");
        await pool.request()
            .input('email', email)
            .input('pass', passwordHash)
            .query("UPDATE Users SET PasswordHash = @pass, Role = 'admin' WHERE Email = @email");

        console.log("👉 7. Update terminado, enviando respuesta"); // Log 5
        res.json({ success: true, message: 'Admin configurado.' });

    } catch (error) {
        console.error("❌ ERROR EN SETUP:", error); // Log de Error
        res.status(500).json({ error: 'Error en setup', detalles: error.message });
    }
});

// 2. RUTA DE LOGIN
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const pool = await getConnection();

        // 1. Buscar usuario por email
        const result = await pool.request()
            .input('email', email)
            .query('SELECT UserId, FullName, Email, Role, PasswordHash FROM Users WHERE Email = @email');

        if (result.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        }

        const user = result.recordset[0];

        // 2. COMPARAR HASHES (Magia de Bcrypt) 🕵️‍♂️
        // Compara la contraseña escrita ("12345") con el hash guardado en BD
        const validPassword = await bcrypt.compare(password, user.PasswordHash);

        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        }

        // 3. Generar Token de Sesión
        const token = jwt.sign({ id: user.UserId, role: user.Role }, SECRET_KEY, { expiresIn: '8h' });

        res.json({
            success: true,
            token,
            user: { id: user.UserId, name: user.FullName, role: user.Role }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error de servidor' });
    }
});

// 1. Obtener Mapa (GeoJSON) - ADAPTADO A NUEVAS TABLAS
app.get('/api/floors/:id/geojson', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getConnection();
        // Consultamos la tabla Locals filtrando por FloorId
        const result = await pool.request()
            .input('floorId', id)
            .query(`
        SELECT LocalId, Code, Name, Area, MonthlyPrice, Status, Giro, ImageUrl, GeoJSON
        FROM Locals 
        WHERE FloorId = @floorId
      `);

        const geoJSON = {
            type: "FeatureCollection",
            features: result.recordset.map(row => {
                // Parseamos el string JSON que viene de la BD
                let geometryData;
                try {
                    geometryData = JSON.parse(row.GeoJSON);
                } catch (e) {
                    geometryData = null; // o un valor por defecto
                }

                return {
                    type: "Feature",
                    properties: {
                        // Mapeamos las columnas nuevas al formato que espera el frontend
                        id: row.LocalId,    // El ID numérico
                        code: row.Code,     // El código visual (P1_L001)
                        nombre: row.Name,
                        area: row.Area,
                        precio: row.MonthlyPrice,
                        estado: row.Status, // Status en BD -> estado en frontend
                        giro: row.Giro,
                        imagen: row.ImageUrl
                    },
                    geometry: geometryData
                };
            })
        };
        res.json(geoJSON);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el mapa' });
    }
});

// Obtener lista de pisos (para el menú del frontend)
app.get('/api/floors', async (req, res) => {
    try {
        const pool = await getConnection();
        // Los ordenamos por la columna 'Order'
        const result = await pool.request().query('SELECT FloorId, Name FROM Floors ORDER BY [Order] ASC');
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener pisos' });
    }
});

// 2. Crear Solicitud - ADAPTADO A NUEVAS TABLAS
app.post('/api/requests', async (req, res) => {
    const { localId, nombre, email, telefono, giro, mensaje } = req.body;

    try {
        const pool = await getConnection();

        // A. Buscar o Crear Usuario (Tabla Users)
        let userResult = await pool.request()
            .input('email', email)
            .query('SELECT UserId FROM Users WHERE Email = @email');

        let userId;
        if (userResult.recordset.length > 0) {
            userId = userResult.recordset[0].UserId;
        } else {
            // Falta PasswordHash y Role, ponemos defaults para este usuario rápido
            const insertUser = await pool.request()
                .input('fullName', nombre).input('email', email)
                .query("INSERT INTO Users (FullName, Email, PasswordHash, Role) OUTPUT INSERTED.UserId VALUES (@fullName, @email, 'no_pass', 'client')");
            userId = insertUser.recordset[0].UserId;
        }

        // B. Insertar en Requests (Usando nombres nuevos)
        await pool.request()
            .input('localId', localId)
            .input('userId', userId)
            .input('giro', giro)
            .input('plan', mensaje) // Mensaje del form -> PlanNegocio en BD
            .query(`
        INSERT INTO Requests (LocalId, UserId, GiroSolicitado, PlanNegocio, Status) 
        VALUES (@localId, @userId, @giro, @plan, 'pending')
      `);

        // C. Actualizar estado del Local a 'negociacion' (Status)
        await pool.request()
            .input('localId', localId)
            .query("UPDATE Locals SET Status = 'negociacion' WHERE LocalId = @localId");

        // D. Enviar correo (Opcional, si falla no rompe el flujo)
        try {
            await transporter.sendMail({
                from: '"Plaza Comercial" <tucorreo@gmail.com>',
                to: email,
                subject: 'Solicitud Recibida',
                text: `Hola ${nombre}, recibimos tu solicitud para el local.`
            });
        } catch (e) { console.log("Correo falló"); }

        res.json({ success: true, message: 'Solicitud creada correctamente.' });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: 'Error en servidor' });
    }
});

// 3. Admin: Listar Solicitudes - ADAPTADO
app.get('/api/admin/requests', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
      SELECT r.RequestId, r.Status, r.CreatedAt, r.GiroSolicitado, r.PlanNegocio,
             u.FullName, u.Email,
             l.Code as LocalCode, l.Name as LocalName
      FROM Requests r
      JOIN Users u ON r.UserId = u.UserId
      JOIN Locals l ON r.LocalId = l.LocalId
      ORDER BY r.CreatedAt DESC
    `);
        res.json(result.recordset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error admin' });
    }
});

// 4. Admin: Aprobar/Rechazar (CON CORREOS PARA AMBOS CASOS)
app.put('/api/admin/requests/:id', async (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'approve' o 'reject'

    try {
        const pool = await getConnection();

        // --- PASO COMÚN: OBTENER DATOS DEL USUARIO Y LOCAL ---
        // Necesitamos el correo y nombre tanto para aprobar como para rechazar
        const reqData = await pool.request()
            .input('rid', id)
            .query(`
        SELECT r.LocalId, u.Email, u.FullName, l.Name AS LocalName, l.Code
        FROM Requests r
        JOIN Users u ON r.UserId = u.UserId
        JOIN Locals l ON r.LocalId = l.LocalId
        WHERE r.RequestId = @rid
      `);

        if (reqData.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        const { LocalId, Email, FullName, LocalName, Code } = reqData.recordset[0];

        // --- LÓGICA DE APROBACIÓN ---
        if (action === 'approve') {

            // 1. Actualizar BD
            await pool.request().input('rid', id).query("UPDATE Requests SET Status = 'approved' WHERE RequestId = @rid");
            await pool.request().input('lid', LocalId).query("UPDATE Locals SET Status = 'ocupado' WHERE LocalId = @lid");

            // 2. Correo de Éxito
            try {
                await transporter.sendMail({
                    from: '"Administración Plaza" <tucorreo@gmail.com>',
                    to: Email,
                    subject: '¡Felicidades! Tu solicitud ha sido APROBADA 🎉',
                    html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h1 style="color: #166534;">¡Solicitud Aprobada!</h1>
              <p>Hola <strong>${FullName}</strong>,</p>
              <p>Nos complace informarte que tu solicitud para el local <strong>${LocalName} (${Code})</strong> ha sido aceptada.</p>
              <hr>
              <p>Por favor acude a la administración para firmar contrato.</p>
            </div>
          `
                });
            } catch (e) { console.error("Error correo aprobación:", e); }

            // --- LÓGICA DE RECHAZO ---
        } else if (action === 'reject') {

            // 1. Actualizar BD (Liberar el local)
            await pool.request().input('rid', id).query("UPDATE Requests SET Status = 'rejected' WHERE RequestId = @rid");

            // IMPORTANTE: Volvemos a poner el local en 'disponible' (Verde)
            await pool.request().input('lid', LocalId).query("UPDATE Locals SET Status = 'disponible' WHERE LocalId = @lid");

            // 2. Correo de Rechazo (NUEVO) 📧
            try {
                await transporter.sendMail({
                    from: '"Administración Plaza" <tucorreo@gmail.com>',
                    to: Email,
                    subject: 'Actualización sobre tu solicitud de renta',
                    html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2 style="color: #991b1b;">Solicitud No Aprobada</h2>
              <p>Hola <strong>${FullName}</strong>,</p>
              <p>Gracias por tu interés en el local <strong>${LocalName}</strong>.</p>
              <p>Lamentablemente, en esta ocasión tu solicitud no ha podido ser aprobada o el local ha sido asignado a otra propuesta prioritaria.</p>
              <br>
              <p>El local ha sido liberado, pero te invitamos a visitar nuestro mapa nuevamente y revisar otras opciones disponibles.</p>
              <p>Atentamente,<br>La Administración</p>
            </div>
          `
                });
                console.log(`📧 Correo de rechazo enviado a ${Email}`);
            } catch (e) { console.error("Error correo rechazo:", e); }
        }

        res.json({ success: true, message: `Solicitud procesada: ${action}` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// --- GESTIÓN DE USUARIOS (CLIENTES) ---
app.get('/api/admin/users', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT UserId, FullName, Email, Role FROM Users');
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
});

// --- GESTIÓN DE USUARIOS: EDITAR ---
app.put('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const { fullName, email, role } = req.body; // Recibimos los datos nuevos

    try {
        const pool = await getConnection();
        await pool.request()
            .input('id', id)
            .input('name', fullName)
            .input('email', email)
            .input('role', role)
            .query(`
        UPDATE Users 
        SET FullName = @name, Email = @email, Role = @role 
        WHERE UserId = @id
      `);

        res.json({ success: true, message: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error actualizando usuario' });
    }
});

// --- GESTIÓN DE USUARIOS: ELIMINAR ---
app.delete('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();

        // 1. Primero borramos sus solicitudes (para que SQL no se queje por las llaves foráneas)
        await pool.request()
            .input('id', id)
            .query('DELETE FROM Requests WHERE UserId = @id');

        // 2. Ahora sí borramos al usuario
        await pool.request()
            .input('id', id)
            .query('DELETE FROM Users WHERE UserId = @id');

        res.json({ success: true, message: 'Usuario y sus datos eliminados' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error eliminando usuario' });
    }
});

// --- GESTIÓN DE LOCALES ---
app.get('/api/admin/locals', async (req, res) => {
    try {
        const pool = await getConnection();
        // Traemos todo para poder editar
        const result = await pool.request().query('SELECT LocalId, Name, Code, Status, MonthlyPrice, Area, Giro FROM Locals');
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo locales' });
    }
});

// Editar un local (Ej: Cambiar precio o estado manualmente)
app.put('/api/admin/locals/:id', async (req, res) => {
    const { id } = req.params;
    const { status, price } = req.body;

    try {
        const pool = await getConnection();
        await pool.request()
            .input('id', id)
            .input('status', status)
            .input('price', price)
            .query('UPDATE Locals SET Status = @status, MonthlyPrice = @price WHERE LocalId = @id');

        res.json({ success: true, message: 'Local actualizado' });
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando local' });
    }
});

// --- RUTAS KPI CON FILTROS DINÁMICOS ---

// KPI 1: Estado de Locales (Filtra por Piso)
app.get('/api/admin/kpi/status', async (req, res) => {
    try {
        const { floorId } = req.query; // Recibimos el filtro
        const pool = await getConnection();

        let query = "SELECT Status, COUNT(*) as Total FROM Locals WHERE 1=1";
        const request = pool.request();

        if (floorId && floorId !== 'all') {
            query += " AND FloorId = @fid";
            request.input('fid', floorId);
        }

        query += " GROUP BY Status";

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) { res.status(500).json({ error: 'Error KPI 1' }); }
});

// KPI 2: Solicitudes por Estado (Filtra por Piso y Fechas)
app.get('/api/admin/kpi/requests-status', async (req, res) => {
    try {
        const { floorId, startDate, endDate } = req.query;
        const pool = await getConnection();

        let query = `
      SELECT r.Status, COUNT(*) as Total 
      FROM Requests r
      JOIN Locals l ON r.LocalId = l.LocalId
      WHERE 1=1
    `;
        const request = pool.request();

        if (floorId && floorId !== 'all') {
            query += " AND l.FloorId = @fid";
            request.input('fid', floorId);
        }
        if (startDate) {
            query += " AND r.CreatedAt >= @start";
            request.input('start', startDate);
        }
        if (endDate) {
            query += " AND r.CreatedAt <= @end"; // Nota: Idealmente sumar un día o ajustar hora
            request.input('end', endDate + ' 23:59:59');
        }

        query += " GROUP BY r.Status";

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) { res.status(500).json({ error: 'Error KPI 2' }); }
});

// KPI 3: Demanda por Piso (Filtra por Fechas)
app.get('/api/admin/kpi/requests-floor', async (req, res) => {
    try {
        const { startDate, endDate } = req.query; // Aquí no filtramos por piso porque la gráfica ES de pisos
        const pool = await getConnection();

        let query = `
      SELECT f.Name as FloorName, COUNT(r.RequestId) as Total
      FROM Requests r
      JOIN Locals l ON r.LocalId = l.LocalId
      JOIN Floors f ON l.FloorId = f.FloorId
      WHERE 1=1
    `;
        const request = pool.request();

        if (startDate) {
            query += " AND r.CreatedAt >= @start";
            request.input('start', startDate);
        }
        if (endDate) {
            query += " AND r.CreatedAt <= @end";
            request.input('end', endDate + ' 23:59:59');
        }

        query += " GROUP BY f.Name";

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) { res.status(500).json({ error: 'Error KPI 3' }); }
});

// KPI 4: Top Giros (Filtra por Piso y Fechas)
app.get('/api/admin/kpi/requests-giro', async (req, res) => {
    try {
        const { floorId, startDate, endDate } = req.query;
        const pool = await getConnection();

        let query = `
      SELECT TOP 5 r.GiroSolicitado as Giro, COUNT(*) as Total 
      FROM Requests r
      JOIN Locals l ON r.LocalId = l.LocalId
      WHERE 1=1
    `;
        const request = pool.request();

        if (floorId && floorId !== 'all') {
            query += " AND l.FloorId = @fid";
            request.input('fid', floorId);
        }
        if (startDate) {
            query += " AND r.CreatedAt >= @start";
            request.input('start', startDate);
        }
        if (endDate) {
            query += " AND r.CreatedAt <= @end";
            request.input('end', endDate + ' 23:59:59');
        }

        query += " GROUP BY r.GiroSolicitado ORDER BY Total DESC";

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) { res.status(500).json({ error: 'Error KPI 4' }); }
});

// KPI 5: HISTORIAL RECIENTE (Últimas 20)
app.get('/api/admin/kpi/recent-history', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
      SELECT TOP 20 
        r.RequestId, 
        r.Status, 
        r.CreatedAt, 
        u.FullName, 
        l.Code,
        l.Name as LocalName
      FROM Requests r
      JOIN Users u ON r.UserId = u.UserId
      JOIN Locals l ON r.LocalId = l.LocalId
      ORDER BY r.CreatedAt DESC
    `);
        res.json(result.recordset);
    } catch (error) { res.status(500).json({ error: 'Error KPI History' }); }
});

// --- REPORTE: EXPORTAR A CSV/EXCEL ---
app.get('/api/report/locals', async (req, res) => {
    try {
        const pool = await getConnection();

        // 1. Obtenemos TODAS las solicitudes con sus detalles
        const result = await pool.request().query(`
      SELECT 
        r.RequestId, 
        u.FullName AS Cliente, 
        u.Email, 
        l.Code AS Local, 
        l.Name AS NombreLocal, 
        r.Status AS Estado, 
        r.GiroSolicitado, 
        r.PlanNegocio,
        r.CreatedAt AS Fecha
      FROM Requests r
      JOIN Users u ON r.UserId = u.UserId
      JOIN Locals l ON r.LocalId = l.LocalId
      ORDER BY r.CreatedAt DESC
    `);

        // 2. Construimos el CSV manualmente (Cabeceras)
        let csv = 'ID,Cliente,Email,Local,Nombre Local,Estado,Giro,Plan,Fecha\n';

        // 3. Agregamos las filas
        result.recordset.forEach(row => {
            // Formatear fecha
            const fecha = new Date(row.Fecha).toLocaleDateString();
            // Limpiar textos para evitar errores con las comas (ponemos comillas alrededor)
            const plan = row.PlanNegocio.replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""');

            csv += `${row.RequestId},"${row.Cliente}","${row.Email}","${row.Local}","${row.NombreLocal}",${row.Estado},"${row.GiroSolicitado}","${plan}","${fecha}"\n`;
        });

        // 4. Enviamos el archivo
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="reporte_plaza.csv"');
        res.send(csv);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error generando el reporte');
    }
});


// --- REPORTE OPERATIVO (FORMATO ETL / CSV) ---
app.get('/api/report/operational', async (req, res) => {
    try {
        const pool = await getConnection();

        // Consulta Maestra para KPIs por Local
        const result = await pool.request().query(`
      SELECT 
        l.Code AS local_id,
        l.FloorId AS piso,
        l.Area AS area_m2,
        l.MonthlyPrice AS precio_mensual,
        l.Status AS estado,
        l.Giro AS giro,
        -- KPI: Demanda (Conteo de solicitudes totales)
        (SELECT COUNT(*) FROM Requests r WHERE r.LocalId = l.LocalId) AS solicitudes_recibidas,
        -- KPI: Recencia (Fecha de la última solicitud recibida)
        (SELECT MAX(CreatedAt) FROM Requests r WHERE r.LocalId = l.LocalId) AS ultima_solicitud,
        -- KPI: Fecha Ocupación (Fecha de la solicitud aprobada, si existe)
        (SELECT TOP 1 CreatedAt FROM Requests r WHERE r.LocalId = l.LocalId AND r.Status = 'approved' ORDER BY CreatedAt DESC) AS fecha_ocupacion
      FROM Locals l
      ORDER BY l.Code ASC
    `);

        // Construcción del CSV exacto
        let csv = 'local_id,piso,area_m2,precio_mensual,estado,giro,solicitudes_recibidas,ultima_solicitud,fecha_ocupacion\n';

        result.recordset.forEach(row => {
            // Función helper para formatear fechas a YYYY-MM-DD o dejar vacío
            const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : '';

            const ultimaSol = formatDate(row.ultima_solicitud);
            const fechaOcup = formatDate(row.fecha_ocupacion);

            csv += `${row.local_id},${row.piso},${row.area_m2},${row.precio_mensual},${row.estado},${row.giro},${row.solicitudes_recibidas},${ultimaSol},${fechaOcup}\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="reporte_operativo.csv"');
        res.send(csv);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error generando reporte operativo');
    }
});

app.listen(PORT, () => {
    console.log(`---------------------- Servidor actualizado corriendo en puerto ${PORT}`);
});