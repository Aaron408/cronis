import axios from 'axios';

const getToken = () => {
  const userData = JSON.parse(localStorage.getItem('cronisUsuario'));
  return userData ? userData.token : null;
};

export const AuthApi = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

export const activityApi = axios.create({
  baseURL: 'http://localhost:3002',
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

export const paymentApi = axios.create({
  baseURL: 'http://localhost:3003',
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

const setupInterceptors = (apiInstance) => {
  apiInstance.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('cronisUsuario');
        window.location.href = '/';
      }
      return Promise.reject(error);
    }
  );
};

setupInterceptors(AuthApi);
setupInterceptors(activityApi);
setupInterceptors(paymentApi);
