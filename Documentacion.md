## Visión General

El código es un script escrito en Node.js que se encarga de:

1. Cargar variables de entorno para obtener credenciales (ID de cuenta, ID de cliente y secreto de cliente) necesarias para acceder a la API de Zoom.
2. Obtener un token de acceso para la API de Zoom usando Server-to-Server OAuth.
3. Obtener la lista completa de usuarios asociados a una cuenta de Zoom.
4. Obtener las grabaciones de cada usuario en un rango de fechas determinado (en este caso, desde hace 2 días hasta la fecha actual).
5. Descargar estas grabaciones y guardarlas en el disco, organizándolas en carpetas estructuradas por correo del usuario, mes y día.
6. Verificar que los archivos descargados tengan el tamaño esperado, reintentando la descarga si es necesario.
7. En caso de no obtener grabaciones, limpiar las carpetas vacías creadas.

## Explicación Detallada del Código

```js
require('dotenv').config();
```
- Importa la librería `dotenv` y ejecuta el método `config()` para cargar las variables definidas en un archivo `.env`. Esto permite acceder a datos sensibles como claves y secretos sin incluirlos directamente en el código.

```js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');
```
- `axios`: Librería para realizar solicitudes HTTP a la API de Zoom.
- `fs`: Módulo nativo de Node.js para trabajar con el sistema de archivos (crear, leer y escribir archivos y carpetas).
- `path`: Módulo nativo de Node.js para manipular rutas de archivos y directorios de manera consistente.
- `qs`: Librería para formatear objetos en cadenas de consulta (query strings), útil para peticiones `application/x-www-form-urlencoded`.

```js
(async () => {
```
- Inicia una función asíncrona anónima y autoejecutable. Esto permite el uso de `await` dentro del bloque.

```js
    const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
    const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
    const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
```
- Asigna a constantes las credenciales necesarias para la autenticación con Zoom, obtenidas del archivo `.env`.

```js
    const DOWNLOAD_FOLDER = 'D:\\ReunionesZoom';
    const bConsoleLog = false;
```
- `DOWNLOAD_FOLDER`: Ruta del directorio base donde se guardarán las grabaciones.
- `bConsoleLog`: Valor booleano para activar o desactivar la impresión de información adicional por consola. Si es `false`, se limita la salida informativa.

```js
    const fechaActual = new Date();
```
- Obtiene la fecha y hora actuales del sistema.

*(Se observa que había variables comentadas para filtrar por mes. No se utilizan en la versión actual.)*

```js
    let accessToken = null;
    let tokenExpirationTime = 0;
```
- Variables para almacenar el token de acceso (`accessToken`) y el tiempo de expiración de dicho token (`tokenExpirationTime`).

```js
    const conditionalLog = (message) => {
        if (bConsoleLog) {
            console.log(message);
        }
    };
```
- Función auxiliar que imprime mensajes por consola solo si `bConsoleLog` es `true`.

```js
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
```
- Esta función limpia el nombre del archivo, removiendo o reemplazando caracteres no válidos en el sistema de archivos. También ajusta su longitud máxima.

```js
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
```
- Envía una solicitud a la API de Zoom para obtener un token de acceso usando las credenciales proporcionadas.
- Guarda el token y calcula su tiempo de expiración.

```js
    const ensureValidToken = async () => {
        if (!accessToken || Date.now() >= tokenExpirationTime) {
            await getZoomAccessToken();
        }
        return accessToken;
    };
```
- Verifica si el token de acceso actual existe y no ha expirado. Si es inválido, solicita uno nuevo.
- Garantiza que cualquier petición posterior a la API de Zoom tenga un token válido.

```js
    const getAllUsers = async () => {
        let allUsers = [];
        let nextPageToken = '';
        let pageCount = 0;
        const maxPages = 4000;

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
                    console.warn(`Se alcanzó el límite máximo de páginas (${maxPages}).`);
                    break;
                }
            } catch (error) {
                console.error('Error al obtener usuarios:', error.response?.data || error.message);
                throw error;
            }
        } while (nextPageToken);

        return allUsers;
    };
```
- Obtiene todos los usuarios de la cuenta de Zoom en varias páginas, usando `next_page_token` para ir iterando.
- Controla el número máximo de páginas para evitar ciclos infinitos.
- Devuelve un arreglo con todos los usuarios encontrados.

```js
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
                    console.warn(`Se alcanzó el límite máximo de páginas (${maxPages}) para el usuario ${userId}.`);
                    break;
                }
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    console.warn('Se alcanzó el límite de tasa. Esperando...');
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
```
- Obtiene todas las grabaciones de un usuario específico en el rango de fechas dado.
- Maneja paginación y posibles limitaciones de velocidad (códigos de estado 429).
- Retorna todas las grabaciones encontradas.

```js
    const getStartDate = () => {
        const date = new Date();
        date.setDate(date.getDate() - 2);
        return date.toISOString().split('T')[0];
    };

    const getEndDate = () => {
        const date = new Date();
        return date.toISOString().split('T')[0];
    };
```
- `getStartDate()` devuelve la fecha de hace 2 días en formato `YYYY-MM-DD`.
- `getEndDate()` devuelve la fecha actual en el mismo formato.
- Estas funciones definen el rango de fechas para las grabaciones.

```js
    const formatMonthFolderName = (dateString) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const monthNumber = ('0' + (date.getMonth() + 1)).slice(-2);
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const monthName = months[date.getMonth()];
        return `${year}_${monthNumber}_${monthName}`;
    };

    const formatDateFolderName = (dateString) => {
        const date = new Date(dateString);
        const day = ('0' + date.getDate()).slice(-2);
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const year = date.getFullYear();
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayName = days[date.getDay()];
        return `${day}-${month}-${year}_${dayName}`;
    };
```
- `formatMonthFolderName()`: Da formato al nombre de la carpeta del mes basado en el año, el número de mes y el nombre del mes.
- `formatDateFolderName()`: Da formato al nombre de la carpeta del día, agregando el día, el mes, el año y el nombre del día de la semana.
- Estas funciones ayudan a organizar las grabaciones en carpetas estructuradas por mes y día.

```js
    const downloadRecording = async (downloadUrl, filePath, expectedSize, retries = 5, validateSize = true) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const token = await ensureValidToken();
                const urlWithToken = `${downloadUrl}?access_token=${token}`;
                const response = await axios.get(urlWithToken, { responseType: 'stream' });

                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                if (validateSize) {
                    const localFileSize = fs.statSync(filePath).size;
                    if (localFileSize === expectedSize) {
                        console.log(`  Descarga exitosa en intento ${attempt}: ${filePath}`);
                        return true;
                    } else {
                        console.log(`  Tamaño incorrecto en intento ${attempt}. Esperado: ${expectedSize, Obtenido: ${localFileSize}`);
                        fs.unlinkSync(filePath);
                    }
                } else {
                    console.log(`  Descarga exitosa en intento ${attempt}: ${filePath}`);
                    return true;
                }
            } catch (error) {
                console.error(`  Error en intento ${attempt} al descargar la grabación:`, error);
            }
        }
        console.log(`  Fallo después de ${retries} intentos: ${filePath}`);
        return false;
    };
```
- Descarga una grabación desde Zoom y guarda el archivo localmente.
- Reintenta la descarga hasta un número máximo de intentos.
- Opcionalmente, valida que el tamaño del archivo descargado coincida con el esperado. Si no coincide, elimina el archivo y reintenta.
- Devuelve `true` si la descarga fue exitosa, o `false` en caso de agotar los reintentos sin éxito.

```js
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
                    conditionalLog(`Procesando reunión: ID ${meeting.id, Tema: ${meeting.topic}, Fecha: ${meeting.start_time}`);

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

                        if (fs.existsSync(filePath)) {
                            if (fileExtension.toLowerCase() !== 'vtt') {
                                const localFileSize = fs.statSync(filePath).size;
                                const zoomFileSize = recordingFile.file_size;

                                if (localFileSize === zoomFileSize) {
                                    conditionalLog(`  El archivo ya existe y es completo: ${fileName}`);
                                    status = 'archivado';
                                } else {
                                    console.log(`  Tamaño del archivo local no coincide. Eliminando y descargando de nuevo: ${fileName}`);
                                    fs.unlinkSync(filePath);
                                    const downloadSuccess = await downloadRecording(recordingFile.download_url, filePath, recordingFile.file_size);
                                    if (downloadSuccess) {
                                        status = 'descargado';
                                        filesDownloaded = true;
                                    } else {
                                        status = 'error';
                                    }
                                }
                            } else {
                                conditionalLog(`  El archivo .vtt ya existe: ${fileName}`);
                                status = 'archivado';
                            }
                        } else {
                            console.log(`  El archivo no existe. Descargando: ${fileName}`);
                            const isVttFile = fileExtension.toLowerCase() === 'vtt';
                            const downloadSuccess = await downloadRecording(recordingFile.download_url, filePath, recordingFile.file_size, 5, !isVttFile);

                            if (downloadSuccess) {
                                status = 'descargado';
                                filesDownloaded = true;
                            } else {
                                status = 'error';
                            }
                        }

                        downloadRecords.push({
                            userEmail: user.email,
                            fileName: fileName,
                            recordingId: recordingFile.id,
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
```
- Esta función reúne todos los pasos:
  - Determina el rango de fechas.
  - Obtiene todos los usuarios.
  - Para cada usuario, obtiene sus grabaciones en el rango especificado.
  - Por cada grabación, descarga todos los archivos relacionados (video, audio, transcripciones), organizándolos en carpetas por correo del usuario, mes y día.
  - Verifica si el archivo ya existe y, si es necesario, lo reemplaza.
  - Si no se descarga nada para una reunión, se eliminan las carpetas vacías.
  - Registra la información de cada archivo descargado.

```js
    await listAndBackupRecordings();
})();
```
- Llama a la función principal `listAndBackupRecordings()` y ejecuta todo el proceso.
- Cierra la función autoejecutable.

## Resumen

Este código se encarga de conectarse a la API de Zoom, obtener y descargar grabaciones de todos los usuarios de una cuenta, organizar los archivos en el sistema de archivos y asegurarse de que las descargas sean correctas. También implementa mecanismos de reintento en caso de descargas incompletas y elimina carpetas vacías al final del proceso para mantener el orden.