import axios from 'axios';

// Para Next.js, las variables de entorno públicas deben usar el prefijo NEXT_PUBLIC_
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de respuesta para manejar errores globalmente
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Aquí puedes agregar lógica global de manejo de errores
    if (error.response) {
      // El servidor respondió con un código de estado fuera del rango 2xx
      console.error('Error de respuesta:', error.response.status, error.response.data);
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta
      console.error('Error de red:', error.message);
    } else {
      // Algo pasó al configurar la petición
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
