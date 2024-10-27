# Respaldo Incremental de Grabaciones de Zoom

Este proyecto es un script en Node.js que permite realizar el respaldo incremental de grabaciones de Zoom de manera automatizada. Utiliza la API de Zoom para obtener las grabaciones y almacenarlas en un directorio local en la estructura especificada por el usuario.

## Tabla de Contenidos

- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Funcionalidades](#funcionalidades)
- [Consideraciones](#consideraciones)
- [Licencia](#licencia)

## Instalación

1. Clona este repositorio:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd <NOMBRE_DEL_PROYECTO>
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env` en la raíz del proyecto con tus credenciales de Zoom (ver [Configuración](#configuración) para más detalles).

## Configuración

Este script utiliza un archivo `.env` para gestionar de forma segura las credenciales de Zoom. Asegúrate de incluir los siguientes valores en tu archivo `.env`:

```dotenv
ZOOM_ACCOUNT_ID=tu_zoom_account_id
ZOOM_CLIENT_ID=tu_zoom_client_id
ZOOM_CLIENT_SECRET=tu_zoom_client_secret
```

## Uso

Para ejecutar el script y comenzar el respaldo de grabaciones, utiliza el siguiente comando:

```bash
node RespaldoIncrementalSubcarpetasZoom.js
```

El script realiza las siguientes acciones:

1. Obtiene las credenciales de acceso a Zoom mediante OAuth.
2. Recupera la lista de usuarios en la cuenta de Zoom.
3. Obtiene las grabaciones de cada usuario para el mes actual.
4. Descarga y almacena las grabaciones en la carpeta especificada, organizándolas por mes y día.

### Parámetros Modificables

En el archivo `RespaldoIncrementalSubcarpetasZoom.js`, puedes modificar:

- `DOWNLOAD_FOLDER`: Carpeta de destino para el almacenamiento de grabaciones (por defecto `D:\\ReunionesZoom`).
- `bConsoleLog`: Activa o desactiva los mensajes `console.log` para depuración (por defecto `false`).

## Estructura del Proyecto

- **RespaldoIncrementalSubcarpetasZoom.js**: Script principal que gestiona el proceso de autenticación, recuperación y respaldo de grabaciones.
- **.env**: Archivo para almacenar las credenciales de acceso a Zoom.
- **node_modules/**: Directorio de dependencias instaladas por npm.
- **package.json**: Archivo de configuración del proyecto con la lista de dependencias.

## Funcionalidades

- **Sanitización de Nombres de Archivos**: El script limpia los nombres de archivos para evitar caracteres inválidos en el sistema de archivos.
- **Respaldo Incremental**: Comprueba si una grabación ya ha sido respaldada previamente, y sólo descarga los archivos que no existen o que han sido modificados.
- **Estructura de Carpetas por Mes y Día**: Las grabaciones se organizan en carpetas jerárquicas según el mes y el día de la reunión, facilitando el acceso y el ordenamiento.

## Consideraciones

- **Tasa de Llamadas a la API**: La API de Zoom puede tener límites de tasa. El script incluye pausas para respetar estos límites, pero en cuentas con gran cantidad de usuarios y grabaciones, puede tardar más tiempo en completar el respaldo.
- **Espacio en Disco**: Asegúrate de contar con espacio en disco suficiente, especialmente si el número de grabaciones es elevado.
- **Permisos de Acceso**: Este script requiere permisos de nivel de cuenta en Zoom. Revisa los permisos de tu aplicación en la consola de Zoom.

## Licencia

Este proyecto está licenciado bajo la licencia MIT. 
