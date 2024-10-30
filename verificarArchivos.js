const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Ruta del archivo CSV
const csvFilePath = 'zoomus_recordings__20241029.csv'; // Cambia esta ruta por la de tu archivo CSV
// Ruta de la carpeta principal de archivos de Zoom
const zoomFolder = 'd:\\ReunionesZoom';

// Función para leer los IDs de las reuniones desde el CSV
async function obtenerMeetingIds() {
  const meetingIds = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        const meetingId = row['ID de la reunión'] || row['meeting_id']; // Asegúrate de usar el nombre correcto de la columna
        if (meetingId) {
          meetingIds.push(meetingId.trim());
        }
      })
      .on('end', () => resolve(meetingIds))
      .on('error', (error) => reject(error));
  });
}

// Función recursiva para buscar archivos que contienen el meeting_id en el nombre
async function buscarArchivos(folderPath, meetingId) {
  const files = fs.readdirSync(folderPath);
  let encontrado = false;

  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      // Si es una carpeta, llamar a la función recursivamente
      encontrado = encontrado || buscarArchivos(fullPath, meetingId);
    } else if (file.includes(meetingId)) {
      console.log(`Archivo encontrado para ID ${meetingId} en: ${fullPath}`);
      return true; // Termina la búsqueda si encuentra el archivo
    }
  }

  return encontrado;
}

// Función principal
async function verificarArchivos() {
  try {
    const meetingIds = await obtenerMeetingIds();

    for (const meetingId of meetingIds) {
      const encontrado = await buscarArchivos(zoomFolder, meetingId);
      if (!encontrado) {
        console.log(`Archivo NO encontrado para ID ${meetingId}`);
      }
    }
  } catch (error) {
    console.error('Error al leer el archivo CSV o verificar archivos:', error);
  }
}

// Ejecutar el script
verificarArchivos();
