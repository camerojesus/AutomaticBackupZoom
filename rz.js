require('dotenv').config(); // Importar y configurar dotenv
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

(async () => {
    // Configuración
    const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
    const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
    const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

    const DOWNLOAD_FOLDER = 'D:\\ReunionesZoom'; // Carpeta donde se guardarán las grabaciones
    const bConsoleLog = false; // Constante para controlar los console.log

    // Modificar estas líneas para obtener el mes actual
    const fechaActual = new Date();

    const nMesInicial = 7; // Los meses en JavaScript van de 0 a 11
    const nMesFinal = 10;

    let accessToken = null;
    let tokenExpirationTime = 0;

    // Función para log condicional
    const conditionalLog = (message) => {
        if (bConsoleLog) {
            console.log(message);
        }
    };

    // Función mejorada para sanitizar nombres de archivo
    const sanitizarNombreArchivo = (nombreArchivo) => {
        nombreArchivo = nombreArchivo.replace(/#/g, '');        
        const caracteresInvalidos = /["*:<>?\/\\|#&]/g;
        let nombreSanitizado = nombreArchivo.replace(caracteresInvalidos, '-');
        nombreSanitizado = nombreSanitizado.replace(/_/g, ' ');
        nombreSanitizado = nombreSanitizado.replace(/\s+/g, ' ');
        nombreSanitizado = nombreSanitizado.trimStart();
        nombreSanitizado = nombreSanitizado.replace(/^[^a-zA-Z0-9]+/, '');
        nombreSanitizado = nombreSanitizado.trim().replace(/^[\.]+|[\.]+$/g, '');

        if (nombreSanitizado.length > 255) {
            const extension = path.extname(nombreSanitizado);
            const nombreBase = path.basename(nombreSanitizado, extension);
            nombreSanitizado = nombreBase.substring(0, 251 - extension.length) + extension;
        }

        return nombreSanitizado;
    };

    // Función para obtener el token de acceso usando Server-to-Server OAuth
    const getZoomAccessToken = async () => {
        try {
            const response = await axios.post('https://zoom.us/oauth/token', qs.stringify({
                grant_type: 'account_credentials',
                account_id: ZOOM_ACCOUNT_ID
            }), {
                auth: {
                    username: ZOOM_CLIENT_ID,
                    password: ZOOM_CLIENT_SECRET
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            accessToken = response.data.access_token;
            tokenExpirationTime = Date.now() + (response.data.expires_in * 1000);
            return accessToken;
        } catch (error) {
            console.error('Error al obtener el token de acceso:', error.response?.data || error.message);
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

    // Función para obtener todos los usuarios en la cuenta
    const getAllUsers = async () => {
        let allUsers = [];
        let nextPageToken = '';
        let pageCount = 0;
        const maxPages = 4000; // Establece un límite máximo de páginas por precaución

        do {
            try {
                const token = await ensureValidToken();
                const response = await axios.get('https://api.zoom.us/v2/users', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    params: {
                        page_size: 600,
                        next_page_token: nextPageToken
                    }
                });
                allUsers = allUsers.concat(response.data.users);
                nextPageToken = response.data.next_page_token;
                pageCount++;

                await new Promise(resolve => setTimeout(resolve, 500));

                if (pageCount >= maxPages) {
                    console.warn(`Se alcanzó el límite máximo de páginas (${maxPages}). Es posible que no se hayan obtenido todos los usuarios.`);
                    break;
                }
            } catch (error) {
                console.error('Error al obtener usuarios:', error.response?.data || error.message);
                throw error;
            }
        } while (nextPageToken);

        return allUsers;
    };

    // Función para obtener las grabaciones de Zoom para un usuario y un rango de fechas
    const getAllZoomRecordings = async (userId, fromDate, toDate) => {
        let allRecordings = [];
        let nextPageToken = '';
        let pageCount = 0;
        const maxPages = 2000;

        do {
            try {
                const token = await ensureValidToken();
                const response = await axios.get(`https://api.zoom.us/v2/users/${userId}/recordings`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    params: {
                        page_size: 600,
                        next_page_token: nextPageToken,
                        from: fromDate,
                        to: toDate
                    }
                });
                allRecordings = allRecordings.concat(response.data.meetings);
                nextPageToken = response.data.next_page_token;
                pageCount++;

                conditionalLog(`Página ${pageCount} obtenida para el usuario ${userId}. Total de grabaciones hasta ahora: ${allRecordings.length}`);

                await new Promise(resolve => setTimeout(resolve, 500));

                if (pageCount >= maxPages) {
                    console.warn(`Se alcanzó el límite máximo de páginas (${maxPages}) para el usuario ${userId}. Es posible que no se hayan obtenido todas las grabaciones.`);
                    break;
                }
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    console.warn('Se alcanzó el límite de tasa. Esperando antes de intentar de nuevo...');
                    await new Promise(resolve => setTimeout(resolve, 60000));
                    continue;
                }
                console.error('Error al obtener grabaciones:', error.response?.data || error.message);
                throw error;
            }
        } while (nextPageToken);

        conditionalLog(`Total de grabaciones obtenidas para el usuario ${userId}: ${allRecordings.length}`);
        return allRecordings;
    };

    // Función para obtener la fecha inicial basada en nMesInicial
    const getStartDate = () => {
        const date = new Date();
        date.setMonth(nMesInicial - 1);
        date.setDate(1);
        return date.toISOString().split('T')[0];
    };

    // Función para obtener la fecha final basada en nMesFinal
    const getEndDate = () => {
        const date = new Date();
        date.setMonth(nMesFinal);
        date.setDate(0);
        return date.toISOString().split('T')[0];
    };

    // Función para formatear la fecha en AAAA_MM_NombreDelMes
    const formatMonthFolderName = (dateString) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const monthNumber = ('0' + (date.getMonth() + 1)).slice(-2);
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const monthName = months[date.getMonth()];
        return `${year}_${monthNumber}_${monthName}`;
    };

    // Función para formatear la fecha en dd-mm-aaaa_DíaDeLaSemana
    const formatDateFolderName = (dateString) => {
        const date = new Date(dateString);
        const day = ('0' + date.getDate()).slice(-2);
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const year = date.getFullYear();
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayName = days[date.getDay()];
        return `${day}-${month}-${year}_${dayName}`;
    };

    // Función para descargar un archivo de grabación
    const downloadRecording = async (downloadUrl, filePath) => {
        try {
            const token = await ensureValidToken();
            const urlWithToken = `${downloadUrl}?access_token=${token}`;

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

    // Función principal para listar y respaldar las grabaciones
    const listAndBackupRecordings = async () => {
        try {
            const fromDate = getStartDate();
            const toDate = getEndDate();

            conditionalLog(`Obteniendo grabaciones desde ${fromDate} hasta ${toDate}`);

            const users = await getAllUsers();

            if (!users || users.length === 0) {
                console.log("No se encontraron usuarios en la cuenta.");
                return;
            }

            let allDownloadRecords = [];

            for (const user of users) {
                const userId = user.id;
                console.log(`\nObteniendo grabaciones para el usuario: ${user.email}`);

                const recordings = await getAllZoomRecordings(userId, fromDate, toDate);

                if (!recordings || recordings.length === 0) {
                    console.log(`No se encontraron grabaciones para el usuario ${user.email} en el período especificado.`);
                    continue;
                }

                let downloadRecords = [];

                for (const meeting of recordings) {
                    conditionalLog(`Procesando reunión: ID ${meeting.id}, Tema: ${meeting.topic}, Fecha de inicio: ${meeting.start_time}`);

                    const monthFolderName = formatMonthFolderName(meeting.start_time);
                    const dayFolderName = formatDateFolderName(meeting.start_time);
                    const meetingFolderPath = path.join(DOWNLOAD_FOLDER, user.email, monthFolderName, dayFolderName);

                    let filesDownloaded = false;

                    for (const recordingFile of meeting.recording_files) {
                        const fileExtension = recordingFile.file_extension || 'mp4';
                        const sanitizedTopic = sanitizarNombreArchivo(meeting.topic);
                        const fileName = `${sanitizedTopic} ${recordingFile.recording_type} ${recordingFile.id}.${fileExtension}`;
                        const filePath = path.join(meetingFolderPath, fileName);

                        let status;

                        // Obtener la lista de archivos en el directorio si existe
                        let filesInFolder = [];
                        if (fs.existsSync(meetingFolderPath)) {
                            filesInFolder = fs.readdirSync(meetingFolderPath);
                        }

                        // Verificar si algún archivo contiene el ID de la grabación
                        const fileExists = filesInFolder.some(file => file.includes(recordingFile.id));

                        if (fileExists) {
                            conditionalLog(`  El archivo ya existe (según ID): ${recordingFile.id}`);
                            status = 'archivado';
                        } else {
                            conditionalLog(`  Descargando archivo: ${fileName}`);
                            await downloadRecording(recordingFile.download_url, filePath);
                            conditionalLog(`  Archivo guardado en: ${filePath}`);
                            status = 'descargado';
                            filesDownloaded = true;
                        }

                        downloadRecords.push({
                            userEmail: user.email,
                            fileName: fileName,
                            recordingId: recordingFile.id, // Añadido para claridad en los registros
                            dateTime: recordingFile.recording_start,
                            status: status
                        });
                    }

                    if (!filesDownloaded && fs.existsSync(meetingFolderPath)) {
                        const files = fs.readdirSync(meetingFolderPath);
                        if (files.length === 0) {
                            fs.rmdirSync(meetingFolderPath);
                            const monthFolderPath = path.dirname(meetingFolderPath);
                            const monthFiles = fs.readdirSync(monthFolderPath);
                            if (monthFiles.length === 0) {
                                fs.rmdirSync(monthFolderPath);
                            }
                        }
                    }
                }

                allDownloadRecords = allDownloadRecords.concat(downloadRecords);
            }

        } catch (error) {
            console.error('Error al respaldar las grabaciones:', error);
            if (error.response) {
                console.error('Respuesta del servidor:', error.response.data);
                console.error('Estado HTTP:', error.response.status);
            } else if (error.request) {
                console.error('No se recibió respuesta del servidor');
            } else {
                console.error('Error de configuración de la solicitud:', error.message);
            }
        }
    };

    // Ejecutar inmediatamente
    await listAndBackupRecordings();

})();
