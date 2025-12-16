const fs = require('fs');
const path = require('path');

// Ajusta esta ruta si tu carpeta 'public' está en otro lugar
const directorioLocales = path.join(__dirname, 'frontend', 'public', 'locales');

const renombrarMasivo = () => {
    if (!fs.existsSync(directorioLocales)) {
        console.error(`❌ Error: No encuentro la carpeta en: ${directorioLocales}`);
        return;
    }

    // 1. Obtener todas las carpetas de locales
    const carpetas = fs.readdirSync(directorioLocales).filter(file => {
        return fs.statSync(path.join(directorioLocales, file)).isDirectory();
    });

    console.log(`📂 Se encontraron ${carpetas.length} carpetas de locales.`);

    carpetas.forEach(carpeta => {
        const rutaCarpeta = path.join(directorioLocales, carpeta);

        // 2. Leer archivos de la carpeta
        const archivos = fs.readdirSync(rutaCarpeta).filter(file => {
            // Filtramos solo imágenes y evitamos archivos de sistema
            return /\.(jpg|jpeg|png|webp)$/i.test(file);
        });

        if (archivos.length === 0) return;

        console.log(`🔹 Procesando ${carpeta}: ${archivos.length} imágenes encontradas...`);

        // 3. Renombrar temporalmente para evitar conflictos 
        // (Por si ya existe un "1.jpg" y no queremos sobrescribirlo por error antes de tiempo)
        archivos.forEach((archivo, index) => {
            const rutaVieja = path.join(rutaCarpeta, archivo);
            const nombreTemp = `temp_${Date.now()}_${index}.tmp`;
            const rutaTemp = path.join(rutaCarpeta, nombreTemp);
            fs.renameSync(rutaVieja, rutaTemp);
        });

        // 4. Renombrar a 1.jpg, 2.jpg...
        // Volvemos a leer los temporales
        const archivosTemp = fs.readdirSync(rutaCarpeta).filter(f => f.includes('.tmp'));

        archivosTemp.forEach((archivoTemp, index) => {
            const rutaTemp = path.join(rutaCarpeta, archivoTemp);
            const nuevoNombre = `${index + 1}.jpg`; // Forzamos extensión .jpg para tu frontend
            const rutaFinal = path.join(rutaCarpeta, nuevoNombre);

            fs.renameSync(rutaTemp, rutaFinal);
        });
    });

    console.log("\n✅ ¡Listo! Todas las imágenes han sido renombradas a 1.jpg, 2.jpg, etc.");
};

renombrarMasivo();