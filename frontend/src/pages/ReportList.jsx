import React, { useState, useEffect } from "react";
import { getAllReports, updateReport, deleteReport } from "../api/reportApi";
import { toast } from "react-hot-toast";
import { Eye, Check, Trash2, X, RefreshCcw } from "lucide-react";

const ReportList = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await getAllReports();
      setReports(response.reports || []);
    } catch (error) {
      toast.error("Gagal memuat daftar laporan");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleResolveReport = async (id, currentStatus) => {
    try {
      const resolved = !currentStatus;
      await updateReport(id, resolved);
      toast.success(
        `Laporan berhasil ${resolved ? "diselesaikan" : "dibuka kembali"}`
      );
      fetchReports();
    } catch (error) {
      toast.error("Gagal mengubah status laporan");
      console.error(error);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus laporan ini?")) {
      return;
    }

    try {
      await deleteReport(id);
      toast.success("Laporan berhasil dihapus");
      fetchReports();
    } catch (error) {
      toast.error("Gagal menghapus laporan");
      console.error(error);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={fetchReports}
          className="btn btn-primary btn-sm"
          disabled={loading}
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <RefreshCcw size={18} color="white" className="mx-3" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-10 bg-base-200 rounded-lg">
          <p className="text-lg">Belum ada laporan yang dikirim</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>No</th>
                <th>Judul</th>
                <th>Deskripsi</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, index) => (
                <tr
                  key={report._id}
                  className={report.resolved ? "bg-base-200" : ""}
                >
                  <td>{index + 1}</td>
                  <td>{report.title}</td>
                  <td className="max-w-xs truncate">{report.description}</td>
                  <td>
                    <span
                      className={`badge ${
                        report.resolved ? "" : "badge-error text-white h-full"
                      }`}
                    >
                      {report.resolved ? "Selesai" : "Belum Selesai"}
                    </span>
                  </td>
                  <td className="flex gap-2">
                    <button
                      onClick={() => handleViewReport(report)}
                      className="btn btn-sm btn-circle btn-ghost text-info"
                      title="Lihat Detail"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() =>
                        handleResolveReport(report._id, report.resolved)
                      }
                      className={`btn btn-sm btn-circle btn-ghost ${
                        report.resolved ? "text-warning" : "text-success"
                      }`}
                      title={report.resolved ? "Buka Kembali" : "Selesaikan"}
                    >
                      {report.resolved ? <X size={18} /> : <Check size={18} />}
                    </button>
                    <button
                      onClick={() => handleDeleteReport(report._id)}
                      className="btn btn-sm btn-circle btn-ghost text-error"
                      title="Hapus"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Detail Laporan */}
      <dialog className={`modal ${isModalOpen ? "modal-open" : ""}`}>
        <div className="modal-box max-w-3xl">
          <form method="dialog">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={closeModal}
            >
              ✕
            </button>
          </form>
          {selectedReport && (
            <div>
              <h3 className="font-bold text-lg mb-4">{selectedReport.title}</h3>
              <div className="grid gap-4">
                <div>
                  <p className="font-semibold mb-1">Status:</p>
                  <span
                    className={`badge ${
                      selectedReport.resolved
                        ? "badge-success"
                        : "badge-warning"
                    }`}
                  >
                    {selectedReport.resolved ? "Selesai" : "Belum Selesai"}
                  </span>
                </div>
                <div>
                  <p className="font-semibold mb-1">Deskripsi:</p>
                  <p className="whitespace-pre-wrap bg-base-200 p-3 rounded-md">
                    {selectedReport.description}
                  </p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Gambar:</p>
                  <div className="bg-base-200 p-2 rounded-md">
                    <img
                      src={selectedReport.image}
                      alt={selectedReport.title}
                      className="max-h-96 object-contain mx-auto rounded-md"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-action">
                <button
                  onClick={() => {
                    handleResolveReport(
                      selectedReport._id,
                      selectedReport.resolved
                    );
                    closeModal();
                  }}
                  className={`btn ${
                    selectedReport.resolved ? "btn-warning" : "btn-success"
                  }`}
                >
                  {selectedReport.resolved ? "Buka Kembali" : "Tandai Selesai"}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="modal-backdrop" onClick={closeModal}></div>
      </dialog>
    </div>
  );
};

export default ReportList;
