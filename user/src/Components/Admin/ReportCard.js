import { FiDownload } from "react-icons/fi";

const ReportCard = ({ icon: Icon, title, description, onGenerate }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
    <div className="flex items-center mb-4">
      <Icon className="w-6 h-6 text-gray-500 mr-3" />
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
    <p className="text-gray-600 mb-4 flex-grow">{description}</p>
    <button
      onClick={onGenerate}
      className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800"
    >
      <FiDownload className="mr-2" />
      Generar Reporte
    </button>
  </div>
);

export default ReportCard;
