const fs = require('fs').promises;
const path = require('path');

// Define la carpeta de trabajo aquí
const carpetaDeTrabajo = 'd:/ReunionesZoom';

// Función para eliminar archivos con guiones bajos en el nombre
async function eliminarArchivosConGuionBajo(nombreArchivo, rutaCompleta) {
    if (nombreArchivo.includes('_')) {
        try {
            // Elimina el archivo
            await fs.unlink(rutaCompleta);
            console.log(`Archivo eliminado: "${rutaCompleta}"`);
        } catch (error) {
            console.error(`Error eliminando el archivo "${rutaCompleta}":`, error);
        }
    }
}

// Función recursiva para recorrer las carpetas
async function recorrerYEliminarArchivos(directorio) {
    // Muestra el directorio actual
    console.log(`Entrando al directorio: ${directorio}`);

    const entradas = await fs.readdir(directorio, { withFileTypes: true });

    for (const entrada of entradas) {
        const rutaCompleta = path.join(directorio, entrada.name);

        if (entrada.isDirectory()) {
            // Recursivamente procesa subcarpetas
            await recorrerYEliminarArchivos(rutaCompleta);
        } else if (entrada.isFile()) {
            // Muestra el archivo que se está analizando
            console.log(`Analizando archivo: ${entrada.name}`);

            // Elimina archivos con guiones bajos en el nombre
            await eliminarArchivosConGuionBajo(entrada.name, rutaCompleta);
        }
    }
}

// Inicia el proceso
recorrerYEliminarArchivos(carpetaDeTrabajo)
    .then(() => console.log('Proceso completado.'))
    .catch((error) => console.error('Error:', error));
