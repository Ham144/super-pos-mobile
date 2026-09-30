import { useState } from "react"; // Import useEffect
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast"; // Asumsi Anda menggunakan react-hot-toast untuk notifikasi
import { useMutation } from "@tanstack/react-query";
import { convertVoucherPublicToGenerated } from "@/api/voucherApi";

export default function ConvertVoucherToGenerated() {
  const [searchParams] = useSearchParams();
  const publicCode = searchParams.get("publicCode");

  // Inisialisasi formdata dengan objek agar bisa menyimpan multiple fields
  const [formData, setFormData] = useState({
    email: "",
    publicCode: publicCode || "", // Mengisi publicCode dari URL secara otomatis
  });
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const {
    mutate: onSubmit,
    isPending,
    isError,
  } = useMutation({
    mutationKey: ["voucher"],
    mutationFn: async () => {
      const data = {
        publicCode: publicCode,
        customerEmail: formData.email,
      };
      const res = await convertVoucherPublicToGenerated(data);
      return res;
    },
    onSuccess: (res) => {
      toast.success(res?.response?.data?.message || response?.message);
      setFormData({ email: "", publicCode: "" });
    },
    onError: (e) => {
      setError(e?.response?.data?.message);
      toast.error(
        e?.response?.data?.message || "Gagal konversi, terjadi kesalahan",
      );
    },
  });

  const onChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (isError) {
    return (
      <div className="flex flex-1 min-h-screen  flex-col items-center">
        <div role="alert" className="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Error! Gagal konversi, terjadi kesalahan.</span>
          <span>{error}</span>
        </div>
        <button
          className="btn mt-96 bg-secondary-foreground text-white rounded-md"
          onClick={() => (window.location.href = "/voucher")}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="mx-auto min-h-screen flex justify-center items-center">
        <span className="loading loading-ring loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="card w-full max-w-md bg-white shadow-xl rounded-lg border border-gray-200">
        <div className="card-body p-8">
          <h2 className="card-title text-2xl font-bold text-gray-800 mb-6 text-center">
            Konversi Voucher Anda
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            className="space-y-5"
          >
            {/* Input Email */}
            <div>
              <label htmlFor="email" className="label">
                <span className="label-text font-medium text-gray-700">
                  Email Anda
                </span>
              </label>
              <input
                name="email"
                onChange={onChange}
                value={formData.email} // Menggunakan formData.email
                type="email"
                placeholder="Masukkan email Anda"
                className="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-blue-950"
                required // Menjadikan field ini wajib diisi
              />
            </div>

            {/* Tombol Submit */}
            <div className="card-actions justify-end pt-4">
              <button
                type="submit"
                className="btn btn-primary w-full text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors duration-300"
              >
                Konversi Voucher
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
