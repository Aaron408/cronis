import axios from "axios";

const getToken = () => {
  const userData = JSON.parse(localStorage.getItem("cronisUsuario"));
  return userData ? userData.token : null;
};

export const AuthApi = axios.create({
  baseURL: "http://localhost:5000",
  // https://vercel-authservice-ubuyl8xwl-aarons-projects-ab43df53.vercel.app
  headers: {
    Authorization: `Bearer ${getToken()}`,
    'Access-Control-Allow-Origin': '*',
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  },
});

export const UsersApi = axios.create({
  baseURL: "http://localhost:5001",
  headers: {
    Authorization: `Bearer ${getToken()}`,
    'Access-Control-Allow-Origin': '*',
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  },
});

export const ActivitiesApi = axios.create({
  baseURL: "http://localhost:5002",
  //Sin pool
  // https://vercel-authservice-ubuyl8xwl-aarons-projects-ab43df53.vercel.app
  //Con pool  
  // https://activities-services-bp09fxw4u-aarons-projects-ab43df53.vercel.app/
  headers: {
    Authorization: `Bearer ${getToken()}`,
    'Access-Control-Allow-Origin': '*',
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  },
});

export const ReportsApi = axios.create({
  baseURL: "http://localhost:5003",
  headers: {
    Authorization: `Bearer ${getToken()}`,
    'Access-Control-Allow-Origin': '*',
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  },
});

export const SuscriptionApi = axios.create({
  baseURL: "http://localhost:5004",
  headers: {
    Authorization: `Bearer ${getToken()}`,
    'Access-Control-Allow-Origin': '*',
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  },
});

const setupInterceptors = (apiInstance) => {
  apiInstance.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  apiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        // Evitar redirección si la ruta es "/api/login"
        if (
          error.response.status === 401 &&
          !error.config.url.includes("/api/login")
        ) {
          // Si no estamos en la ruta de login, borrar el token y redirigir
          localStorage.removeItem("cronisUsuario");
          window.location.href = "/";
        }
      }
      return Promise.reject(error);
    }
  );
};

setupInterceptors(AuthApi);
setupInterceptors(UsersApi);
setupInterceptors(ActivitiesApi);
setupInterceptors(ReportsApi);
setupInterceptors(SuscriptionApi);
