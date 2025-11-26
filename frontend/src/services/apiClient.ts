import axios from 'axios';

// Para Next.js, las variables de entorno públicas deben usar el prefijo NEXT_PUBLIC_
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de petición para agregar el token de autenticación
apiClient.interceptors.request.use(
  (config) => {
    // Obtener el token del localStorage
    const token = localStorage.getItem('access_token');
    
    // Si existe el token, agregarlo al header Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta para manejar errores globalmente
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Aquí puedes agregar lógica global de manejo de errores
    if (error.response) {
      // El servidor respondió con un código de estado fuera del rango 2xx
      console.error('Error de respuesta:', error.response.status, error.response.data);
      
      // Si es 401 (No autorizado), redirigir al login
      if (error.response.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      
      // Si es 403 (Prohibido), mostrar mensaje de permisos insuficientes
      if (error.response.status === 403) {
        console.error('No tienes permisos para realizar esta acción');
      }
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
