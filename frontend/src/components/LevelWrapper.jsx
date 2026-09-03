import { getUserInfo } from "@/api/authApi";
import Login from "@/pages/Login";
import { useUserInfo } from "@/store";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect } from "react";
import toast from "react-hot-toast";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const LevelWrapper = () => {
  const { userInfo, setUserInfo, clearUserInfo } = useUserInfo();
  const location = useLocation();
  const navigate = useNavigate();

  // Query untuk mendapatkan info user
  const { data: userInfoTanstack, refetch } = useQuery({
    queryKey: ["userInfo"],
    queryFn: async () => {
      try {
        const res = await getUserInfo();
        setUserInfo(res?.userInfo);
        return res?.userInfo;
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Sesi Anda telah berakhir",
        );
        clearUserInfo();
        return false;
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 300000, // 5 menit
  });

  // Jalankan refetch saat navigasi halaman
  useEffect(() => {
    // Cek token dan refetch data user saat navigasi
    if (location.pathname !== "/login") {
      refetch();
    }
  }, [location.pathname, refetch]);

  const path = location.pathname;

  const publicPath = ["/", "/login", "/about", "/artikel_documentation"];

  // Handle userInfo after loading
  if (publicPath.includes(path)) {
    //area diijinkan tidak login
    return <Outlet />;
  } else {
    //area harus sudah login
    if (
      userInfo &&
      userInfo?.blockedAccess &&
      userInfo?.blockedAccess.includes(path)
    ) {
      toast.error("Anda belum memiliki akses untuk membuka halaman " + path);
      navigate(-1);
    } else if (userInfo?.blockedAccess) {
      return <Outlet />;
    } else {
      // Tampilkan komponen Login tanpa navigasi
      return <Login />;
    }
  }
};

export default LevelWrapper;
