import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axios from "axios";
import { BASE_URL } from "@/api/constant";

export default function DownloadApkPage() {
  // Ambil daftar versi dari backend
  const { data, isLoading, error } = useQuery({
    queryKey: ["apk-list"],
    queryFn: async () => {
      const res = await axios.post(
        `${BASE_URL}/api/v1/download/apk/list`,
        {},
        { withCredentials: true }
      );
      return res?.data?.data || [];
    },
  });

  const { mutateAsync: handleDownloadApk } = useMutation({
    mutationKey: ["download-apk"],
    mutationFn: async (version) => {
      try {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = `${BASE_URL}/api/v1/download/apk`; // ✅ PENTING: ini harus endpoint backend untuk download
        form.target = "_blank";
        form.style.display = "none";

        const input = document.createElement("input");
        input.name = "version";
        input.value = version;
        form.appendChild(input);

        document.body.appendChild(form);
        form.submit();
        form.remove();

        return { success: true };
      } catch (error) {
        console.log(error);
        throw new Error("Gagal memulai download");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Tidak ada akses");
    },
    onSuccess: () => {
      toast.success("Download dimulai");
    },
  });

  //uploading
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Pilih file terlebih dahulu");
      return;
    }

    const formData = new FormData();
    formData.append("apkFile", file);

    try {
      setUploading(true);
      const res = await axios.post(
        `${BASE_URL}/api/v1/download/apk/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      toast.success(`Upload berhasil: ${res?.data?.fileName || "Nama file tidak ditemukan"}`);
      setFile(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Gagal upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row p-6 gap-6 min-h-screen bg-gray-50">

      {/* --- Bagian Daftar Versi APK --- */}
      <div className="flex-1 w-full bg-white rounded-lg shadow-xl p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 border-b pb-3">
          Daftar Versi APK Tersedia
        </h2>

        {isLoading ? (
          <p className="text-center text-gray-600 text-lg py-10">
            Memuat daftar versi...
          </p>
        ) : error ? (
          <p className="text-center text-red-600 text-lg py-10">
            Gagal mengambil versi: {error?.message}
          </p>
        ) : data?.length === 0 ? (
          <p className="text-center text-gray-500 text-lg py-10">
            Belum ada versi APK yang diunggah.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Versi APK
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.map((version, index) => (
                  <tr
                    key={version}
                    className="hover:bg-blue-50 transition duration-150 ease-in-out"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDownloadApk(version)}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-xs transition duration-200"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
