const fs = require('fs');
const path = require('path');

function recorrerDirectorio(directorio, archivosPorTamaño = {}) {
    const archivos = fs.readdirSync(directorio);

    archivos.forEach(archivo => {
        const rutaCompleta = path.join(directorio, archivo);
        const stats = fs.statSync(rutaCompleta);

        if (stats.isDirectory()) {
            recorrerDirectorio(rutaCompleta, archivosPorTamaño);
        } else {
            const tamaño = stats.size;
            if (!archivosPorTamaño[tamaño]) {
                archivosPorTamaño[tamaño] = [];
            }
            archivosPorTamaño[tamaño].push({ ruta: rutaCompleta, mtime: stats.mtime });
        }
    });

    return archivosPorTamaño;
}

function eliminarArchivosRepetidos(directorio) {
    const archivosPorTamaño = recorrerDirectorio(directorio);

    for (const tamaño in archivosPorTamaño) {
        if (archivosPorTamaño[tamaño].length > 1) {
            archivosPorTamaño[tamaño].sort((a, b) => b.mtime - a.mtime);

            for (let i = 1; i < archivosPorTamaño[tamaño].length; i++) {
                fs.unlinkSync(archivosPorTamaño[tamaño][i].ruta);
                console.log(`Eliminado: ${archivosPorTamaño[tamaño][i].ruta}`);
            }
        }
    }
}

const directorio = 'D:/ReunionesZoom'; // Reemplaza con la ruta del directorio que deseas recorrer
eliminarArchivosRepetidos(directorio);