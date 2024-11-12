import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { UsersApi } from "../../api";

//Pages
import AdminHeader from "../../Components/Admin/AdminHeader";
import AdminSideBar from "../../Components/Admin/AdminSideBar";

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    currentMonthUsers: 0,
    previousMonthUsers: 0,
    percentageChange: "0%",
  });
  const [lineChartData, setLineChartData] = useState([
    { name: "Usuarios", data: [] },
  ]);
  const [categories, setCategories] = useState([]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await UsersApi.get("/api/userStatistics");
        setUserStats(response.data);
      } catch (error) {
        console.error("Error fetching user statistics:", error);
      }
    };

    const fetchGraphicsData = async () => {
      try {
        const response = await UsersApi.get("/api/graphicsData");
        const data = response.data.data;

        // Formato de categorías y datos para el gráfico
        const categorias = data.map((item) => {
          const [year, month] = item.mes.split("-");
          const meses = [ "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",];
          return meses[parseInt(month, 10) - 1];
        });
        const valores = data.map((item) => item.total_usuarios);

        setCategories(categorias);
        setLineChartData([{ name: "Usuarios", data: valores }]);
      } catch (error) {
        console.error("Error fetching graphics data:", error);
      }
    };

    fetchGraphicsData();
    fetchUserStats();
  }, []);

  useEffect(() =>{
    console.log(lineChartData);
  },[lineChartData])

  // Calcular cambios porcentuales entre cada mes para el gráfico de barras
  const calculatePercentageChanges = (data) => {
    return data.map((value, index) => {
      if (index === 0) return ""; // No calculamos cambio para el primer mes
      const previousValue = data[index - 1];
      const percentageChange = ((value - previousValue) / previousValue) * 100;
      return `${percentageChange.toFixed(1)}%`; // Formateo con un decimal
    });
  };

  const barChartData = [
    5000, 7000, 6000, 8000, 9000, 11000, 12000, 14000, 15000, 16000, 17000,
    18000,
  ];
  const percentageChanges = calculatePercentageChanges(barChartData);

  // Configuración para el gráfico de líneas
  const lineChartOptions = {
    chart: { type: "line", toolbar: { show: false } },
    colors: ["#4B5563"],
    stroke: { width: 2 },
    grid: { borderColor: "#e5e7eb" },
    xaxis: {
      categories: categories,
      labels: { style: { colors: "#9CA3AF" } },
    },
    yaxis: { labels: { style: { colors: "#9CA3AF" } } },
  };

  // Configuración para el gráfico de barras
  const barChartOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    colors: ["#6B7280"], // Gris mediano
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
        dataLabels: { position: "top" },
      },
    },
    grid: { borderColor: "#e5e7eb" },
    dataLabels: {
      enabled: true,
      formatter: (_, { dataPointIndex }) => percentageChanges[dataPointIndex], // Cambio en % con respecto a la data anterior
      offsetY: -20, // Ajuste de la posición vertical de las etiquetas
      style: {
        colors: ["#111827"],
        fontSize: "12px",
        fontWeight: "bold",
      },
    },
    xaxis: {
      categories: [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ],
      labels: { style: { colors: "#9CA3AF" } },
    },
    yaxis: { labels: { style: { colors: "#9CA3AF" } } },
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSideBar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      <div className="flex-1 overflow-y-auto">
        <AdminHeader toggleSidebar={toggleSidebar} />

        <div className="p-6">
          {/* Tarjetitas info */}
          <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">
            {[
              {
                title: "Usuario totales",
                value: userStats.totalUsers,
                change:
                  userStats.percentageChange >= 0
                    ? "+" + userStats.percentageChange + "%"
                    : "-" + userStats.percentageChange + "%",
              },
              { title: "Total recaudado", value: "$12,345", change: "+12%" },
              { title: "Active activities", value: "42", change: "-2%" },
            ].map((card, index) => (
              <div key={index} className="p-4 bg-white rounded-lg shadow">
                <h3 className="text-base font-medium text-gray-900">
                  {card.title}
                </h3>
                <div className="flex items-baseline mt-4">
                  <p className="text-2xl font-semibold text-gray-900">
                    {card.value}
                  </p>
                  <p
                    className={`ml-2 text-sm font-medium ${
                      card.change.startsWith("+")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {card.change}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Gráficas */}
          <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="text-base font-medium text-gray-900 mb-4">
                Crecimiento en usuarios
              </h3>
              <Chart
                options={lineChartOptions}
                series={lineChartData}
                type="line"
                height={250}
              />
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="text-base font-medium text-gray-900 mb-4">
                Gráfica de ganancias mensuales
              </h3>
              <Chart
                options={barChartOptions}
                series={[{ name: "Ganancias", data: barChartData }]}
                type="bar"
                height={250}
              />
            </div>
          </div>

          {/* Usuario reciente */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Actividad reciente
              </h3>
            </div>
            <ul>
              {[
                {
                  user: "John Doe",
                  action: "created a new project",
                  time: "2 hours ago",
                },
                {
                  user: "Jane Smith",
                  action: "completed a task",
                  time: "4 hours ago",
                },
                {
                  user: "Bob Johnson",
                  action: "uploaded a file",
                  time: "1 day ago",
                },
                {
                  user: "Alice Brown",
                  action: "commented on a project",
                  time: "2 days ago",
                },
              ].map((activity, index) => (
                <li
                  key={index}
                  className="px-4 py-3 border-b border-gray-200 last:border-b-0"
                >
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">
                      {activity.user}
                    </span>{" "}
                    {activity.action}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;