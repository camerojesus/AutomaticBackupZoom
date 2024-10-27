const fs = require('fs').promises;
const path = require('path');

// Define la carpeta de trabajo aquí
const carpetaDeTrabajo = 'd:/ReunionesZoom';

// Función mejorada para sanitizar nombres de archivo (misma estrategia que en RespaldoIncrementalSubcarpetasZoom.js)
async function sanitizarNombreArchivo(nombreArchivo) {
    // Caracteres que causan problemas en OneDrive y sistemas de archivos
    const caracteresInvalidos = /["*:<>?\/\\|]/g;

    // Reemplaza los caracteres inválidos por un guion
    let nombreSanitizado = nombreArchivo.replace(caracteresInvalidos, '-');

    // Reemplaza múltiples espacios consecutivos por uno solo
    nombreSanitizado = nombreSanitizado.replace(/\s+/g, ' ');

    // **Elimina espacios en blanco al inicio del nombre**
    nombreSanitizado = nombreSanitizado.trimStart();

    // Elimina espacios y puntos al inicio y al final del nombre
    nombreSanitizado = nombreSanitizado.trim().replace(/^[\.]+|[\.]+$/g, '');

    // Asegúrate de que el nombre no exceda los 255 caracteres
    if (nombreSanitizado.length > 255) {
        const extension = path.extname(nombreSanitizado);
        const nombreBase = path.basename(nombreSanitizado, extension);
        nombreSanitizado = nombreBase.substring(0, 251 - extension.length) + extension;
    }

    return nombreSanitizado;
}

async function recorrerYCambiarNombres(directorio) {
    // Muestra el directorio actual
    console.log(`Entrando al directorio: ${directorio}`);

    const entradas = await fs.readdir(directorio, { withFileTypes: true });

    for (const entrada of entradas) {
        const rutaCompleta = path.join(directorio, entrada.name);

        if (entrada.isDirectory()) {
            // Recursivamente procesa subcarpetas
            await recorrerYCambiarNombres(rutaCompleta);
        } else if (entrada.isFile()) {
            // Muestra el archivo que se está analizando
            console.log(`Analizando archivo: ${entrada.name}`);

            const nombreSanitizado = await sanitizarNombreArchivo(entrada.name);

            if (nombreSanitizado !== entrada.name) {
                const nuevaRutaCompleta = path.join(directorio, nombreSanitizado);

                // Renombra el archivo
                await fs.rename(rutaCompleta, nuevaRutaCompleta);

                // Imprime el nombre del archivo modificado
                console.log(`Archivo renombrado: "${entrada.name}" -> "${nombreSanitizado}"`);
            }
        }
    }

    // **Sanitiza el nombre de la carpeta actual si es necesario**
    const nombreDirectorio = path.basename(directorio);
    const nombreDirectorioSanitizado = await sanitizarNombreArchivo(nombreDirectorio);

    if (nombreDirectorioSanitizado !== nombreDirectorio) {
        const rutaDirectorioPadre = path.dirname(directorio);
        const nuevaRutaDirectorio = path.join(rutaDirectorioPadre, nombreDirectorioSanitizado);

        // Renombra el directorio
        await fs.rename(directorio, nuevaRutaDirectorio);

        // Muestra el cambio de nombre del directorio
        console.log(`Directorio renombrado: "${directorio}" -> "${nuevaRutaDirectorio}"`);
    }
}

// Inicia el proceso
recorrerYCambiarNombres(carpetaDeTrabajo)
    .then(() => console.log('Proceso completado.'))
    .catch((error) => console.error('Error:', error));
