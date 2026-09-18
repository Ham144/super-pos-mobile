import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Package, Gift } from "lucide-react";

const cards = [
  {
    title: "Penjualan",
    description: "Lihat transaksi dan kelola invoice",
    path: "/invoices",
    cta: "Lihat Invoice",
    icon: FileText,
    accent: "border-blue-600",
    iconBg: "bg-blue-50 text-blue-700",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    title: "Inventori",
    description: "Kelola stok produk dan katalog item",
    path: "/item_library",
    cta: "Kelola Stok",
    icon: Package,
    accent: "border-emerald-600",
    iconBg: "bg-emerald-50 text-emerald-700",
    btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  {
    title: "Promosi",
    description: "Atur diskon, promo, dan voucher",
    path: "/promo",
    cta: "Atur Promo",
    icon: Gift,
    accent: "border-amber-500",
    iconBg: "bg-amber-50 text-amber-700",
    btn: "bg-amber-500 hover:bg-amber-600 text-white",
  },
];

const QuickAccessCards = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.path}
            className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 ${card.accent}`}
          >
            <div
              className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center mb-3`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              {card.title}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{card.description}</p>
            <button
              type="button"
              onClick={() => navigate(card.path)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${card.btn}`}
            >
              {card.cta}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(QuickAccessCards);
