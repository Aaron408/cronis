import axios from 'axios';

// Obtener el token desde localStorage
const getToken = () => {
  const userData = JSON.parse(localStorage.getItem('cronisUsuario'));
  return userData ? userData.token : null;
};

// Instancia para microservicio de usuarios
export const AuthApi = axios.create({
  baseURL: 'http://localhost:5000',  // URL base del microservicio de usuarios
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

// Instancia para microservicio de actividades
export const activityApi = axios.create({
  baseURL: 'http://localhost:3002',  // URL base del microservicio de actividades
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

// Instancia para microservicio de pagos
export const paymentApi = axios.create({
  baseURL: 'http://localhost:3003',  // URL base del microservicio de pagos
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

// Interceptores para manejar redirección y errores de autenticación
const setupInterceptors = (apiInstance) => {
  apiInstance.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        // Token expirado o no válido, redirigir al login
        localStorage.removeItem('cronisUsuario');  // Eliminar usuario del localStorage
        window.location.href = '/';  // Redirigir al login
      }
      return Promise.reject(error);
    }
  );
};

// Aplicar los interceptores a todas las instancias de Axios
setupInterceptors(AuthApi);
setupInterceptors(activityApi);
setupInterceptors(paymentApi);
