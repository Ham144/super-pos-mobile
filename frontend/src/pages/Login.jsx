import { cn } from "@/lib/utils";
import {
  Lock,
  User,
  LogIn,
  Eye,
  EyeOff,
  CheckCircle,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, loginLdap, getUserInfo } from "@/api/authApi";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router";
import { useUserInfo } from "@/store";

export default function Login({ className, ...props }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState("app");

  const path = useLocation().pathname;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Zustand
  const { setUserInfo, clearUserInfo } = useUserInfo();

  const onLoginSuccess = (userData) => {
    setUserInfo(userData);
    queryClient.invalidateQueries(["userInfo"]);

    if (path === "/login" || path === "/register") {
      navigate("/");
    } else {
      toast.loading("Memverifikasi sesi Anda...");
      setTimeout(() => {
        toast.dismiss();
        window.location.reload();
      }, 400);
    }
  };

  const onLoginError = (err) => {
    console.log(err);
    toast.error(
      err?.response?.data?.message ||
        "Login gagal. Periksa username dan password Anda.",
    );
  };

  // Verifikasi sesi via cookie saat komponen dimuat
  useEffect(() => {
    const verifyToken = async () => {
      setIsVerifying(true);

      try {
        const response = await getUserInfo();
        if (!response?.userInfo) return;

        setUserInfo(response.userInfo);
        queryClient.invalidateQueries(["userInfo"]);
      } catch (error) {
        clearUserInfo();
        toast.error("Sesi Anda telah berakhir. Silakan login kembali.");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, []);

  const { mutateAsync: handleLogin, isPending } = useMutation({
    mutationFn: async () => {
      const res = await login({ username, password });
      return res.data;
    },
    retryDelay: 1000,
    mutationKey: ["userInfo"],
    onSuccess: onLoginSuccess,
    onError: onLoginError,
  });

  const { mutateAsync: handleLoginLdap, isPending: isLoginLdapPending } =
    useMutation({
      mutationFn: async () => {
        const res = await loginLdap({ username, password });
        return res.data;
      },
      mutationKey: ["userInfo"],
      onSuccess: onLoginSuccess,
      onError: onLoginError,
    });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (authMethod === "app") {
      handleLogin();
    } else {
      handleLoginLdap();
    }
  };

  const isLoading = isPending || isVerifying || isLoginLdapPending;

  return (
    <div
      className={cn(
        "flex justify-center items-center min-h-screen relative p-4",
        className,
      )}
      {...props}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-500 opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-600 opacity-20 blur-3xl"></div>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md overflow-hidden relative bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        {/* Card Header with Decoration */}
        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2"></div>

          {/* Logo Container */}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2">
            {!isLoading ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-400 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <img
                  src="/internal-pos.png"
                  alt="CSI SUPER POS Logo"
                  width={120}
                  height={120}
                  className="relative rounded-2xl bg-white p-2 shadow-xl transform transition-all duration-300 group-hover:scale-105"
                />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                  <span className="loading loading-spinner w-10 h-10 text-blue-600"></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Section */}
        <CardContent className="pt-20 pb-8 px-8">
          {/* Welcome Text */}
          <div className="text-center space-y-1 mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Selamat Datang Kembali
            </h1>
            <p className="text-xs text-gray-500">
              Pilih metode login dan masukkan kredensial Anda
            </p>
          </div>

          {/* Auth Method Switcher (Tab Button) */}
          <div className="grid grid-cols-2 p-1 mb-6 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setAuthMethod("app")}
              className={cn(
                "flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all",
                authMethod === "app"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              <Smartphone className="w-3.5 h-3.5" />
              App Account
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod("ldap")}
              className={cn(
                "flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all",
                authMethod === "ldap"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              LDAP / SSO
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-xs font-medium text-gray-700 flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5 text-blue-950" />
                {authMethod === "ldap"
                  ? "Active Directory Username"
                  : "Username"}
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  type="text"
                  placeholder={
                    authMethod === "ldap"
                      ? "Masukkan username Active Directory"
                      : "Masukkan username Anda"
                  }
                  required
                  disabled={isLoading}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-gray-700 flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5 text-blue-950" />
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full pl-9 pr-10 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-md shadow-blue-950/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  <span>
                    {isVerifying
                      ? "Memverifikasi..."
                      : isLoginLdapPending
                        ? "Autentikasi LDAP..."
                        : "Memproses..."}
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>
                    Masuk via {authMethod === "ldap" ? "LDAP" : "App"}
                  </span>
                </>
              )}
            </Button>
          </form>
        </CardContent>

        {/* Footer */}
        <div className="px-8 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <p className="text-[11px] text-center text-gray-400">
            © 2024 CSI SUPER POS. All rights reserved.
          </p>
        </div>
      </Card>
    </div>
  );
}
