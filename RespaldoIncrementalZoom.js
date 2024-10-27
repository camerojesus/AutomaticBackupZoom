const axios = require('axios');
const cron = require('node-cron');
const qs = require('qs');
const fs = require('fs');
const path = require('path');

// Configuración
const ZOOM_CLIENT_ID = 'sIVZ0BaTeukpLh2lBpTsg';         // Reemplaza con tu Client ID
const ZOOM_CLIENT_SECRET = '6qVzSJPPgSmX0UY4YdGAmuqUX2tRHbOR'; // Reemplaza con tu Client Secret
const ZOOM_ACCOUNT_ID = 'FQbUD3NFQXyfzekspyJGvw';       // Reemplaza con tu Account ID

const DOWNLOAD_FOLDER = 'D:\\ReunionesZoom'; // Carpeta donde se guardarán las grabaciones

let accessToken = null;
let tokenExpirationTime = 0;

const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutos en milisegundos

// Función para obtener el token de acceso
const getZoomAccessToken = async () => {
    const token = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    try {
        const response = await axios.post('https://zoom.us/oauth/token', qs.stringify({
            grant_type: 'account_credentials',
            account_id: ZOOM_ACCOUNT_ID
        }), {
            headers: {
                'Authorization': `Basic ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        accessToken = response.data.access_token;
        tokenExpirationTime = Date.now() + (response.data.expires_in * 1000);
        return accessToken;
    } catch (error) {
        console.error('Error al obtener el token de acceso:', error.response.data);
        throw error;
    }
};

// Función para asegurar que tenemos un token válido
const ensureValidToken = async () => {
    if (!accessToken || Date.now() >= tokenExpirationTime) {
        await getZoomAccessToken();
    }
    return accessToken;
};

// Funciones para obtener la fecha del primer día del mes y la fecha actual
const getFirstDayOfMonth = () => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
};

const getToday = () => {
    const date = new Date();
    return date.toISOString().split('T')[0];
};

// Función para obtener las grabaciones de Zoom para un rango de fechas
const getAllZoomRecordings = async (fromDate, toDate) => {
    let allRecordings = [];
    let nextPageToken = '';

    do {
        try {
            const token = await ensureValidToken();
            const response = await axios.get('https://api.zoom.us/v2/users/me/recordings', {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: {
                    page_size: 300,
                    next_page_token: nextPageToken,
                    from: fromDate,
                    to: toDate
                }
            });
            allRecordings = allRecordings.concat(response.data.meetings);
            nextPageToken = response.data.next_page_token;

            // Respetar los límites de tasa
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Error al obtener grabaciones:', error.response.data);
            throw error;
        }
    } while (nextPageToken);

    return allRecordings;
};

// Función para descargar un archivo de grabación
const downloadRecording = async (downloadUrl, filePath) => {
    try {
        const token = await ensureValidToken();

        // Agregar el token de acceso al parámetro de la URL
        const urlWithToken = `${downloadUrl}?access_token=${token}`;

        // Verificar si el archivo ya existe
        if (fs.existsSync(filePath)) {
            console.log(`  El archivo ya existe: ${filePath}`);
            return;
        }

        const response = await axios.get(urlWithToken, {
            responseType: 'stream'
        });

        // Crear el directorio si no existe
        fs.mkdirSync(path.dirname(filePath), { recursive: true });

        // Guardar el archivo
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error al descargar la grabación:', error);
        throw error;
    }
};

// Función para listar y respaldar las grabaciones
const listAndBackupRecordings = async () => {
    try {
        const fromDate = getFirstDayOfMonth();
        const toDate = getToday();

        console.log(`Obteniendo grabaciones desde ${fromDate} hasta ${toDate}`);

        const recordings = await getAllZoomRecordings(fromDate, toDate);

        for (const meeting of recordings) {
            console.log(`Procesando reunión: ID ${meeting.id}, Tema: ${meeting.topic}, Fecha de inicio: ${meeting.start_time}`);

            for (const recordingFile of meeting.recording_files) {
                const fileExtension = recordingFile.file_extension || 'mp4';
                const fileName = `${meeting.topic}_${recordingFile.recording_type}_${recordingFile.id}.${fileExtension}`;
                const sanitizedFileName = fileName.replace(/[^a-z0-9áéíóúñü \.\-\(\)]/gi, '_');
                const filePath = path.join(DOWNLOAD_FOLDER, sanitizedFileName);

                if (fs.existsSync(filePath)) {
                    console.log(`  El archivo ya existe y no será descargado: ${sanitizedFileName}`);
                    continue; // Saltar al siguiente archivo
                }

                console.log(`  Descargando archivo: ${sanitizedFileName}`);

                await downloadRecording(recordingFile.download_url, filePath);

                console.log(`  Archivo guardado en: ${filePath}`);
            }
        }
    } catch (error) {
        console.error('Error al respaldar las grabaciones:', error);
    }
};

// Ejecutar el respaldo de grabaciones periódicamente
cron.schedule('0 2 * * *', () => {
    console.log('Iniciando respaldo de grabaciones de Zoom...');
    listAndBackupRecordings();
});

// Ejecutar inmediatamente para pruebas
listAndBackupRecordings();
