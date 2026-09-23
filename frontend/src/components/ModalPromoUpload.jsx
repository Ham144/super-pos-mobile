import { FileUp } from "lucide-react";
import React from "react";

const ModalPromoUpload = ({
  isOpen,
  handleSubmitImportPromo,
  handleFileChange,
  file,
  setIsOpen,
  isImporting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-96 overflow-hidden p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <FileUp className="w-6 h-6" />
          Upload CSV
        </h3>
        <form onSubmit={handleSubmitImportPromo} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Pilih file CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          {file && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <span className="font-medium">File terpilih:</span> {file.name}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isImporting || !file}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
            >
              {isImporting ? "Mengimport..." : "Upload"}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalPromoUpload;
