import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UsersApi } from "../../api";

// Icons
import { IoCameraOutline } from "react-icons/io5";
import { IoMdNotificationsOutline, IoIosArrowBack } from "react-icons/io";
import { FaUser, FaClock } from "react-icons/fa";

export default function Profile() {
  const navigate = useNavigate();
  const handleGoBack = () => {
    navigate("/home");
  };
  const [activeTab, setActiveTab] = useState("personal");
  const [usuario, setUsuario] = useState({
    name: "",
    google_id: "",
    email: "",
    biography: "",
    profile_picture_url: "",
    notifications: "1",
    emailnotifications: "1",
    start_time: "",
    end_time: "",
  });

  const userData = async () => {
    try {
      const response = await UsersApi.get("/api/userData");
      setUsuario(response.data);
    } catch (error) {
      console.error("Error al obtener los datos del usuario", error);
    }
  };

  useEffect(() => {
    userData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUsuario((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleNotificationChange = (name) => {
    setUsuario((prevState) => ({
      ...prevState,
      [name]: prevState[name] === "1" ? "0" : "1",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    UsersApi.put("/api/usuario", userData)
      .then((response) => {
        console.log("Datos actualizados con éxito:", response.data);
      })
      .catch((error) => {
        console.error("Error al actualizar los datos:", error);
      });
  };

  return (
    <div className="container mx-auto py-5 md:py-10 px-1.5 md:px-14 overflow-x-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-start md:justify-between mb-6 space-y-2">
        <h1 className="text-3xl font-bold mb-4 md:mb-0 ml-3 md:ml-0">
          Perfil de Usuario
        </h1>
        <div className="w-full md:w-auto flex justify-end md:justify-start">
          <div
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            onClick={handleGoBack}
          >
            <IoIosArrowBack className="mr-2 h-4 w-4" />
            Volver a la Agenda
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr] max-w-full">
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold">{usuario.name}</h2>
            <p className="text-sm text-gray-500">Desarrollador de Software</p>
            <div className="mt-6 flex flex-col items-center">
              <div className="w-32 h-32 bg-gray-200 rounded-full mb-4 flex items-center justify-center">
                <FaUser className="h-16 w-16 text-gray-500" />
              </div>
              <button className="font-semibold w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center">
                <IoCameraOutline className="inline-block mr-2 h-5 w-5" />
                Cambiar foto
              </button>
            </div>
          </div>
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Estadísticas</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span>Tareas completadas</span>
                  <span>75%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-black h-2.5 rounded-full"
                    style={{ width: "75%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span>Productividad semanal</span>
                  <span>60%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-black h-2.5 rounded-full"
                    style={{ width: "60%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="overflow-x-auto mb-5">
            <nav className="inline-flex px-1.5 py-1.5 bg-gray-100 rounded-lg whitespace-nowrap">
              {["personal", "account", "notifications"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap py-1.5 px-4 font-semibold text-sm ${
                    activeTab === tab
                      ? "bg-white rounded-lg shadow text-gray-800"
                      : "border-transparent text-gray-400"
                  }`}
                >
                  {tab === "personal" && "Información Personal"}
                  {tab === "account" && "Cuenta"}
                  {tab === "notifications" && "Notificaciones"}
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-white border rounded-lg">
            <div className="p-6">
              {activeTab === "personal" && (
                <div>
                  <h2 className="text-xl font-semibold mb-1 text-gray-700">
                    Información Personal
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Actualiza tu información personal aquí. Haz clic en guardar
                    cuando hayas terminado.
                  </p>
                  <div className="space-y-4">
                    <div className="mt-10">
                      <label
                        htmlFor="full-name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        placeholder="Nombre completo"
                        disabled={true}
                        value={usuario.name}
                        className="bg-gray-200 text-gray-400 mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="juan.doe@ejemplo.com"
                        disabled={true}
                        value={usuario.email}
                        className="bg-gray-200 text-gray-400 text-gray-400 mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="bio"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Biografía
                      </label>
                      <textarea
                        id="biography"
                        name="biography"
                        rows={1}
                        placeholder="Cuéntanos un poco sobre ti..."
                        value={
                          usuario.biography == null ? "" : usuario.biography
                        }
                        onChange={handleChange}
                        className="text-gray-600 mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                        style={{ minHeight: "24px" }}
                      ></textarea>
                    </div>
                  </div>
                  <div className="mt-5 mb-2">
                    <h2 className="text-xl font-semibold mb-1 text-gray-700">
                      Horario laboral
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      <div className="relative">
                        <label
                          htmlFor="start_time"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Hora inicio
                        </label>
                        <input
                          type="time"
                          id="start_time"
                          name="start_time"
                          value={usuario.start_time}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm pr-10"
                        />
                        <span className="absolute inset-y-11 right-0 flex items-center pr-3 text-gray-500">
                          <FaClock className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="relative">
                        <label
                          htmlFor="end_time"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Hora fin
                        </label>
                        <input
                          type="time"
                          id="end_time"
                          name="end_time"
                          value={usuario.end_time}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm pr-10"
                        />
                        <span className="absolute inset-y-11 right-0 flex items-center pr-3 text-gray-500">
                          <FaClock className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "account" && (
                <div>
                  <h2 className="text-xl font-semibold mb-1">
                    Configuración de la cuenta
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Administra la configuración de tu cuenta y cambia tu
                    contraseña aquí.
                  </p>
                  <div className="space-y-4 mt-10">
                    <div>
                      <label
                        htmlFor="current-password"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Contraseña actual
                      </label>
                      <input
                        type="password"
                        id="current-password"
                        name="current-password"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="new-password"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Nueva contraseña
                      </label>
                      <input
                        type="password"
                        id="new-password"
                        name="new-password"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="confirm-password"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Confirmar nueva contraseña
                      </label>
                      <input
                        type="password"
                        id="confirm-password"
                        name="confirm-password"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "notifications" && (
                <div>
                  <h2 className="text-xl font-semibold mb-1">
                    Preferencias de notificación
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Configura cómo y cuándo quieres recibir notificaciones.
                  </p>
                  <div className="space-y-4 mt-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center ">
                        <IoMdNotificationsOutline className="h-5 w-5 text-gray-400 mr-2" />
                        <label
                          htmlFor="notifications"
                          className="text-sm font-medium text-gray-700"
                        >
                          Permitir notificaciones
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleNotificationChange("notifications")
                        }
                        className={`${
                          usuario.notifications === "1"
                            ? "bg-black"
                            : "bg-gray-200"
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none`}
                      >
                        <span
                          aria-hidden="true"
                          className={`${
                            usuario.notifications === "1"
                              ? "translate-x-5"
                              : "translate-x-0"
                          } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                        />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Tipos de notificaciones
                      </p>
                      <div className="space-y-2 pt-2">
                        <div className="flex">
                          <button
                            type="button"
                            onClick={() =>
                              handleNotificationChange("emailnotifications")
                            }
                            className={`${
                              usuario.emailnotifications === "1"
                                ? "bg-black"
                                : "bg-gray-200"
                            } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none`}
                          >
                            <span
                              aria-hidden="true"
                              className={`${
                                usuario.emailnotifications === "1"
                                  ? "translate-x-5"
                                  : "translate-x-0"
                              } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                            />
                          </button>
                          <label
                            htmlFor="email-notifications"
                            className="ml-2 block text-sm text-gray-500 font-semibold"
                          >
                            Notificaciones por correo
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 pb-4 flex justify-start">
              <button
                type="button"
                className="font-semibold px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
