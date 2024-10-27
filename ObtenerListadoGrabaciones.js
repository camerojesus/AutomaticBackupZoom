require('dotenv').config();
const axios = require('axios');
const moment = require('moment');

// Obtener las credenciales de Zoom desde el archivo .env
const ZOOM_JWT_TOKEN = process.env.ZOOM_JWT_TOKEN;
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
console.log(ZOOM_JWT_TOKEN);
console.log(ZOOM_ACCOUNT_ID);
console.log(ZOOM_CLIENT_ID);

async function obtenerGrabacionesDelMes() {
  const fechaInicio = moment().startOf('month').format('YYYY-MM-DD');
  const fechaFin = moment().endOf('month').format('YYYY-MM-DD');

  console.log(`Intentando obtener grabaciones desde ${fechaInicio} hasta ${fechaFin}`);

  try {
    const respuesta = await axios.get('https://api.zoom.us/v2/users/me/recordings', {
      headers: {
        'Authorization': `Bearer ${ZOOM_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        from: fechaInicio,
        to: fechaFin
      }
    });

    const grabaciones = respuesta.data.meetings;

    console.log('Grabaciones de este mes:');
    grabaciones.forEach(grabacion => {
      console.log(`- ${grabacion.topic} (${grabacion.start_time})`);
    });

    console.log(`\nInformación de la cuenta:`);
    console.log(`Account ID: ${ZOOM_ACCOUNT_ID}`);
    console.log(`Client ID: ${ZOOM_CLIENT_ID}`);

  } catch (error) {
    console.error('Error al obtener las grabaciones:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
  }
}

obtenerGrabacionesDelMes();
