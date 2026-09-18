import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserRound,
  Store,
  Download,
  BookOpen,
  MessageCircle,
  Mail,
  Network,
} from "lucide-react";

const tools = [
  {
    title: "Kelola Pengguna",
    description: "Atur akun dan hak akses pengguna sistem",
    path: "/all_account",
    icon: Users,
  },
  {
    title: "Kelola SPG",
    description: "Atur data sales promotion girl",
    path: "/spg_reference",
    icon: UserRound,
  },
  {
    title: "Manajemen Outlet",
    description: "Atur outlet dan konfigurasi cabang",
    path: "/outlet_list",
    icon: Store,
  },
  {
    title: "Pelanggan",
    description: "Lihat data pelanggan tercatat",
    path: "/customer_list",
    icon: Users,
  },
  {
    title: "Download APK",
    description: "Unduh aplikasi kasir mobile",
    path: "/downloads/apk",
    icon: Download,
  },
  {
    title: "Dokumentasi",
    description: "Panduan penggunaan sistem",
    path: "/artikel_documentation",
    icon: BookOpen,
  },
  {
    title: "Email Config",
    description: "SMTP & tester pengiriman email",
    path: "/email_config",
    icon: Mail,
  },
  {
    title: "WhatsApp Config",
    description: "Token Fonnte & tester pesan",
    path: "/whatsapp_config",
    icon: MessageCircle,
  },
  {
    title: "LDAP Config",
    description: "Koneksi Active Directory",
    path: "/ldap_config",
    icon: Network,
  },
];

const ToolsAndResources = () => {
  const navigate = useNavigate();

  return (
    <div className="mb-10">
      <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-5">
        Alat & Pengaturan
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.path}
              type="button"
              onClick={() => navigate(tool.path)}
              className="text-left bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-100">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{tool.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(ToolsAndResources);
