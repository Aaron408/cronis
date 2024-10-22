import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UsersApi } from "../../api";
import { toast } from "react-toastify";

// Icons
import { IoCameraOutline } from "react-icons/io5";
import { IoMdNotificationsOutline, IoIosArrowBack } from "react-icons/io";
import { FaUser, FaClock, FaEye, FaEyeSlash, FaLock } from "react-icons/fa";

export default function Profile() {
  const navigate = useNavigate();
  const handleGoBack = () => {
    navigate("/home");
  };
  const [activeTab, setActiveTab] = useState("personal");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saveChangues, setSaveChangues] = useState(false);
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
  const [usuarioCopy, setUsuarioCopy] = useState({
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
      const data = response.data;
      setUsuario(data);
      setUsuarioCopy(data);
    } catch (error) {
      console.error("Error al obtener los datos del usuario", error);
    }
  };

  useEffect(() => {
    userData();
  }, []);

  useEffect(() => {
    console.log(usuarioCopy);
  }, [usuarioCopy]);

  useEffect(() => {
    if ((usuario != usuarioCopy) || (currentPassword != "" || newPassword != "" || repeatPassword != "")) {
      setSaveChangues(true);
    } else {
      setSaveChangues(false);
    }
  }, [usuarioCopy, currentPassword, newPassword, repeatPassword]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUsuarioCopy((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleNotificationChange = (name) => {
    setUsuarioCopy((prevState) => ({
      ...prevState,
      [name]: prevState[name] === "1" ? "0" : "1",
    }));
  };

   const handleSubmit = (e) => {
    e.preventDefault();

    let updateData = { ...usuarioCopy };

    if (currentPassword !== "" || newPassword !== "" || repeatPassword !== "") {
      if (currentPassword === "" || newPassword === "" || repeatPassword === "") {
        return toast.error("Debes llenar correctamente el formulario de actualización de contraseña.");
      } else if (newPassword !== repeatPassword) {
        return toast.error("La nueva contraseña no coincide, inténtalo de nuevo.");
      } else {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }
    }

    UsersApi.post("/api/updateUser", {
      updateData: updateData,
    })
      .then((response) => {
        toast.success("Datos actualizados correctamente!");
        cleanForm();
        userData();
      })
      .catch((error) => {
        if (error.response && error.response.status === 400) {
          toast.error("Contraseña actual incorrecta. Por favor, inténtalo de nuevo.");
        } else {
          toast.error("Error al actualizar los datos. Intenta nuevamente.");
        }
        console.error("Error al actualizar los datos:", error);
      });
  };

  const cleanForm = () =>{
    setCurrentPassword("");
    setNewPassword("");
    setRepeatPassword("");
    setUsuarioCopy({
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
    setShowPassword(false);
    setSaveChangues(false);
  }

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
            <h2 className="text-xl font-semibold">{usuarioCopy.name}</h2>
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
                        value={usuarioCopy.name}
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
                        value={usuarioCopy.email}
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
                          usuarioCopy.biography == null
                            ? ""
                            : usuarioCopy.biography
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
                          value={usuarioCopy.start_time}
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
                          value={usuarioCopy.end_time}
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
                    <div className="relative">
                      <label
                        htmlFor="current-password"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Contraseña actual
                      </label>
                      <div className="absolute mt-4 md:mt-3 left-0 pl-3 flex items-center pointer-events-none">
                        <FaLock
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                      </div>
                      <input
                        type="password"
                        id="current-password"
                        name="current-password"
                        placeholder="Escribe tu contraseña actual"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="mt-1 block w-full pl-10 pr-10 border border-gray-300 rounded-md shadow-sm py-2 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                      />
                    </div>

                    <div className="relative">
                      <label
                        htmlFor="new-password"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Nueva contraseña
                      </label>
                      <div className="absolute mt-4 md:mt-3 left-0 pl-3 flex items-center pointer-events-none">
                        <FaLock
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="new-password"
                        name="new-password"
                        placeholder="Escribe tu nueva contraseña"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-1 block w-full pl-10 pr-10 border border-gray-300 rounded-md shadow-sm py-2 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                      />
                      <div className="absolute inset-y-11 right-0 pr-3 flex items-center">
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <FaEyeSlash
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          ) : (
                            <FaEye className="h-5 w-5" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <label
                        htmlFor="confirm-password"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Confirmar nueva contraseña
                      </label>
                      <div className="absolute mt-4 md:mt-3 left-0 pl-3 flex items-center pointer-events-none">
                        <FaLock
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="confirm-password"
                        name="confirm-password"
                        placeholder="Repite la contraseña"
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        className="mt-1 block w-full pl-10 pr-10 border border-gray-300 rounded-md shadow-sm py-2 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
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
                          usuarioCopy.notifications === "1"
                            ? "bg-black"
                            : "bg-gray-200"
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none`}
                      >
                        <span
                          aria-hidden="true"
                          className={`${
                            usuarioCopy.notifications === "1"
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
                              usuarioCopy.emailnotifications === "1"
                                ? "bg-black"
                                : "bg-gray-200"
                            } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none`}
                          >
                            <span
                              aria-hidden="true"
                              className={`${
                                usuarioCopy.emailnotifications === "1"
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
                onClick={handleSubmit}
                className={`${
                  saveChangues == false && "hidden"
                } font-semibold px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800`}
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
