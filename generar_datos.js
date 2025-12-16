const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. CONFIGURACIÓN
// Ajusta esto si tu carpeta public está en otro lado
const baseDir = path.join(__dirname, 'frontend', 'public', 'locales');
const pisos = [1, 2];
const localesPorPiso = 10;
const fotosPorLocal = 3;

// Función para descargar una imagen
const descargarImagen = (url, destino) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destino);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destino, () => { }); // Borrar si falla
            reject(err);
        });
    });
};

const main = async () => {
    // Crear directorio base si no existe
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
        console.log(`📁 Creado directorio base: ${baseDir}`);
    }

    console.log("🚀 Iniciando generación de carpetas e imágenes...");

    for (let piso of pisos) {
        for (let i = 1; i <= localesPorPiso; i++) {

            // Formato P1_L01, P1_L10, etc.
            const numeroLocal = i.toString().padStart(2, '0'); // Agrega el 0 inicial
            const nombreCarpeta = `P${piso}_L${numeroLocal}`;
            const rutaCarpeta = path.join(baseDir, nombreCarpeta);

            // 1. Crear Carpeta
            if (!fs.existsSync(rutaCarpeta)) {
                fs.mkdirSync(rutaCarpeta);
            }

            console.log(`Processing: ${nombreCarpeta}`);

            // 2. Crear las 3 imágenes
            for (let f = 1; f <= fotosPorLocal; f++) {
                const nombreArchivo = `${f}.jpg`;
                const rutaArchivo = path.join(rutaCarpeta, nombreArchivo);

                // Si ya existe, la saltamos para ahorrar tiempo
                if (fs.existsSync(rutaArchivo)) continue;

                // Color aleatorio para que se vean diferentes
                const randomColor = Math.floor(Math.random() * 16777215).toString(16);
                const texto = `Local ${nombreCarpeta} - Foto ${f}`;
                // URL de placehold.co
                const url = `https://placehold.co/800x600/${randomColor}/ffffff.jpg?text=${encodeURIComponent(texto)}`;

                try {
                    await descargarImagen(url, rutaArchivo);
                } catch (error) {
                    console.error(`Error descargando ${nombreArchivo}:`, error.message);
                }
            }
        }
    }
    console.log("✅ ¡Listo! 20 carpetas y 60 imágenes creadas.");
};

main();