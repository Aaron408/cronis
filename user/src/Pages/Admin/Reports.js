import React, { useState, useEffect } from "react";
import { FiUsers, FiDollarSign, FiActivity } from "react-icons/fi";
import { ReportsApi } from "../../api";
import { toast } from "react-toastify";
import * as XLSX from 'xlsx';

import AdminHeader from "../../Components/Admin/AdminHeader";
import AdminSideBar from "../../Components/Admin/AdminSideBar";
import ReportCard from "../../Components/Admin/ReportCard";

const Reports = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("last30days");
  const [dataReport, setDataReport] = useState([]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const generateExcel = (data, fileName) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const fetchReport = async (endpoint, reportName) => {
    try {
      const response = await ReportsApi.get(`${endpoint}?period=${selectedPeriod}`);
      const data = response.data;
      setDataReport(data.length > 0 ? data : []);
      generateExcel(data, reportName);
      toast.success(`Reporte de ${reportName} generado exitosamente`);
    } catch (error) {
      console.error(`Error al obtener el reporte de ${reportName}`, error);
      toast.error(`Error al generar el reporte de ${reportName}`);
    }
  };

  const handleGenerateReport = (reportType) => {
    switch (reportType) {
      case "registerActivity":
        fetchReport("/api/registerReport", "Usuarios Registrados");
        break;
      case "subscriptionRevenue":
        fetchReport("/api/revenueReport", "Ganancias");
        break;
      case "activitiesReport":
        fetchReport("/api/activityReport", "Actividades");
        break;
      default:
        console.error("Tipo de reporte no reconocido:", reportType);
        toast.error("Tipo de reporte no reconocido");
    }
  };

  const reports = [
    {
      icon: FiUsers,
      title: "Usuarios Registrados",
      description: "Reporte registros de usuarios.",
      onGenerate: () => handleGenerateReport("registerActivity"),
    },
    {
      icon: FiDollarSign,
      title: "Reporte de Ganancias",
      description:
        "Total recaudado en un lapso de tiempo, incluyendo nuevas, actuales y new suscripciones.",
      onGenerate: () => handleGenerateReport("subscriptionRevenue"),
    },
    {
      icon: FiActivity,
      title: "Actividades Creadas",
      description:
        "Analiticas de la cantidad de actividades dadas de alta por los usuarios.",
      onGenerate: () => handleGenerateReport("activitiesReport"),
    },
  ];

  useEffect(() => {
    console.log(dataReport);
  }, [dataReport]);

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSideBar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      <div className="flex-1 overflow-y-auto">
        <AdminHeader toggleSidebar={toggleSidebar} />

        <div className="p-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <h1 className="text-2xl font-semibold text-gray-900 mb-4 sm:mb-0">
                Generar Reportes
              </h1>
              <div className="flex items-center">
                <label className="mr-2 text-sm font-medium text-gray-700">
                  Periodo:
                </label>
                <select
                  id="period"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-white mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-black focus:border-black sm:text-sm rounded-md"
                >
                  <option value="last7days">Ultimos 7 días</option>
                  <option value="last30days">Ultimos 30 días</option>
                  <option value="last3months">Ultimos 3 meses</option>
                  <option value="lastyear">Ultimo año</option>
                  <option value="alltime">Todo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reports.map((report, index) => (
                <ReportCard key={index} {...report} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;