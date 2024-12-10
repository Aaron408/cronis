import React from "react";

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[9999]">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-black mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold">Organizando agenda</h2>
        <p className="text-gray-600 mt-2">Por favor espere...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;

