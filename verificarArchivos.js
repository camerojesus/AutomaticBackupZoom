const fs = require('fs').promises;
const path = require('path');

const directory = 'd:\\ReunionesZoom';

async function traverseDirectory(dir) {
    try {
        const files = await fs.readdir(dir);
        const fileSizeMap = {}; // Inicializar fileSizeMap para el directorio actual

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
                // Si es un directorio, recorrerlo recursivamente
                await traverseDirectory(filePath);
            } else {
                // Obtener la extensión del archivo en minúsculas desde la ruta completa
                const ext = path.extname(filePath).toLowerCase();
                // Si es .txt o .vtt, ignorar el archivo
                if (ext === '.txt' || ext === '.vtt') {
                    continue;
                }
                const size = stats.size;
                const key = `${size}-${ext}`; // Crear una clave combinando tamaño y extensión
                // Almacenar archivos según su tamaño y extensión en el fileSizeMap del directorio actual
                if (fileSizeMap[key]) {
                    fileSizeMap[key].push(filePath);
                } else {
                    fileSizeMap[key] = [filePath];
                }
            }
        }

        // Buscar y mostrar archivos duplicados en el directorio actual
        for (const key in fileSizeMap) {
            if (fileSizeMap[key].length > 1) {
                const [size, ext] = key.split('-');
                console.log(`Archivos repetidos en '${dir}' de tamaño ${size} bytes y extensión ${ext}:`);
                fileSizeMap[key].forEach(filePath => {
                    console.log(`- ${filePath}`);
                });
            }
        }
    } catch (err) {
        console.error(`Error al procesar el directorio ${dir}:`, err);
    }
}

async function main() {
    await traverseDirectory(directory);
}

main();