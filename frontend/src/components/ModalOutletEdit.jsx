import { useEffect, useState } from "react";
import {
  Building2,
  Clock,
  CreditCard,
  FileText,
  Image as ImageIcon,
  MapPin,
  Server,
  Settings2,
  Shield,
  Store,
  Tag,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAdConfig, saveAdConfig } from "@/api/adminApi";
import { getSoapConfigByOutlet, saveSoapConfigByOutlet } from "@/api/soapApi";

const EMPTY_SOAP = {
  endpoint: "",
  usernameNTLM: "",
  passwordNTLM: "",
  timeoutMs: 30000,
  defaults: { noSeries: "SO-RTL", sellToCustNo: "" },
};

const EMPTY_AD = {
  AD_HOST: "",
  AD_PORT: 389,
  AD_DOMAIN: "",
  AD_BASE_DN: "",
};

const TABS = [
  { id: "umum", label: "Umum" },
  { id: "tim", label: "Tim & Brand" },
  { id: "integrasi", label: "Integrasi" },
];

export default function ModalOutletEdit({
  outlet,
  setOutlet,
  onSave,
  onDelete,
  userList,
  brandList,
  spgList,
  selectedFavoritedSkus,
  onOpenPickKasir,
  onOpenBrandPick,
  onOpenSpgPick,
  onOpenFavoritedPick,
  onRemoveKasir,
  onRemoveSpg,
  onRemoveFavoritedSku,
  isSaving,
}) {
  const [activeTab, setActiveTab] = useState("umum");
  const [soapForm, setSoapForm] = useState(EMPTY_SOAP);
  const [adForm, setAdForm] = useState(EMPTY_AD);
  const [hasExistingSoapPassword, setHasExistingSoapPassword] = useState(false);

  useEffect(() => {
    setActiveTab("umum");
  }, [outlet?._id]);

  useEffect(() => {
    if (!outlet?._id) return;

    getSoapConfigByOutlet(outlet._id)
      .then((res) => {
        const data = res?.data;
        if (!data) return;
        setSoapForm({
          endpoint: data.endpoint || "",
          usernameNTLM: data.usernameNTLM || "",
          passwordNTLM: "",
          timeoutMs: data.timeoutMs || 30000,
          defaults: {
            noSeries: data.defaults?.noSeries || "SO-RTL",
            sellToCustNo: data.defaults?.sellToCustNo || "",
          },
        });
        setHasExistingSoapPassword(Boolean(data.hasPassword));
      })
      .catch(() => {
        setSoapForm(EMPTY_SOAP);
        setHasExistingSoapPassword(false);
      });
  }, [outlet?._id]);

  useEffect(() => {
    getAdConfig()
      .then((res) => {
        if (res?.config) setAdForm({ ...EMPTY_AD, ...res.config });
      })
      .catch(() => setAdForm(EMPTY_AD));
  }, [outlet?._id]);

  if (!outlet) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave(outlet);

      if (outlet._id && soapForm.endpoint && soapForm.usernameNTLM) {
        await saveSoapConfigByOutlet(outlet._id, {
          endpoint: soapForm.endpoint,
          usernameNTLM: soapForm.usernameNTLM,
          timeoutMs: Number(soapForm.timeoutMs) || 30000,
          defaults: soapForm.defaults,
          ...(soapForm.passwordNTLM
            ? { passwordNTLM: soapForm.passwordNTLM }
            : {}),
        });
      }

      if (adForm.AD_HOST && adForm.AD_DOMAIN && adForm.AD_BASE_DN) {
        await saveAdConfig({
          ...adForm,
          AD_PORT: Number(adForm.AD_PORT) || 389,
        });
      }

      toast.success("Konfigurasi outlet berhasil disimpan");
      document.getElementById("modalOutletEdit")?.close();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err.message || "Gagal menyimpan",
      );
    }
  };

  return (
    <dialog id="modalOutletEdit" className="modal">
      <div className="modal-box w-11/12 max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Konfigurasi Outlet
            </h3>
            <p className="text-blue-100 text-sm mt-0.5">
              {outlet.kodeOutlet} — {outlet.namaOutlet}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost text-white"
            onClick={() => document.getElementById("modalOutletEdit")?.close()}
          >
            ✕
          </button>
        </div>

        <div role="tablist" className="tabs tabs-boxed m-4 mb-0 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`tab ${activeTab === tab.id ? "tab-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            {activeTab === "umum" && (
              <>
                <Field label="Kode Outlet (NAV Location)" icon={Store}>
                  <input
                    type="text"
                    className="input input-bordered w-full bg-gray-50"
                    value={outlet.kodeOutlet || ""}
                    readOnly
                  />
                </Field>
                <Field label="Nama Outlet" icon={Store}>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={outlet.namaOutlet || ""}
                    onChange={(e) =>
                      setOutlet((p) => ({ ...p, namaOutlet: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Deskripsi" icon={FileText}>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={outlet.description || ""}
                    onChange={(e) =>
                      setOutlet((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Nama Perusahaan" icon={Building2}>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={outlet.namaPerusahaan || ""}
                    onChange={(e) =>
                      setOutlet((p) => ({
                        ...p,
                        namaPerusahaan: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Alamat" icon={MapPin}>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={outlet.alamat || ""}
                    onChange={(e) =>
                      setOutlet((p) => ({ ...p, alamat: e.target.value }))
                    }
                  />
                </Field>
                <Field label="NPWP" icon={CreditCard}>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={outlet.npwp || ""}
                    onChange={(e) =>
                      setOutlet((p) => ({ ...p, npwp: e.target.value }))
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Periode Settlement" icon={Clock}>
                    <input
                      type="number"
                      min="1"
                      className="input input-bordered w-full"
                      value={outlet.periodeSettlement ?? 1}
                      onChange={(e) =>
                        setOutlet((p) => ({
                          ...p,
                          periodeSettlement: parseInt(e.target.value, 10) || 1,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Jam Settlement" icon={Clock}>
                    <input
                      type="time"
                      className="input input-bordered w-full"
                      value={outlet.jamSettlement || "00:00"}
                      onChange={(e) =>
                        setOutlet((p) => ({
                          ...p,
                          jamSettlement: e.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
                <Field label="Logo Outlet" icon={ImageIcon}>
                  <input
                    type="file"
                    accept="image/*"
                    className="file-input file-input-bordered w-full"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () =>
                        setOutlet((p) => ({ ...p, logo: reader.result }));
                      reader.readAsDataURL(file);
                    }}
                  />
                  {outlet.logo && (
                    <img
                      src={outlet.logo}
                      alt="Logo"
                      className="mt-2 w-24 h-24 object-contain border rounded-lg"
                    />
                  )}
                </Field>
              </>
            )}

            {activeTab === "tim" && (
              <>
                <PickerBlock
                  label="Brand Terhubung"
                  icon={Tag}
                  emptyText="Belum ada brand"
                  onOpen={onOpenBrandPick}
                  items={(brandList?.data?.data || [])
                    .filter((b) => outlet.brandIds?.includes(b._id))
                    .map((b) => ({ id: b._id, label: b.name }))}
                />
                <PickerBlock
                  label="Kasir List"
                  icon={Users}
                  emptyText="Pilih kasir"
                  onOpen={onOpenPickKasir}
                  items={(userList?.data || [])
                    .filter((u) => outlet.kasirList?.includes(u._id))
                    .map((u) => ({
                      id: u._id,
                      label: u.username,
                      onRemove: () => onRemoveKasir(u._id),
                    }))}
                />
                <PickerBlock
                  label="SPG List"
                  icon={Users}
                  emptyText="Pilih SPG"
                  onOpen={onOpenSpgPick}
                  items={(spgList?.data || [])
                    .filter((s) =>
                      outlet.spgList?.some(
                        (id) => String(id) === String(s._id),
                      ),
                    )
                    .map((s) => ({
                      id: s._id,
                      label: s.name,
                      onRemove: () => onRemoveSpg(s._id),
                    }))}
                />
                <PickerBlock
                  label="SKU Tampil Gambar"
                  icon={ImageIcon}
                  emptyText="Pilih SKU favorites"
                  onOpen={onOpenFavoritedPick}
                  items={selectedFavoritedSkus.map((sku) => ({
                    id: sku,
                    label: sku,
                    onRemove: () => onRemoveFavoritedSku(sku),
                  }))}
                />
              </>
            )}

            {activeTab === "integrasi" && (
              <>
                <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                  <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Mode Operasi Mobile
                  </h4>
                  <select
                    className="select select-bordered w-full bg-white"
                    value={outlet.mode || ""}
                    onChange={(e) =>
                      setOutlet((p) => ({
                        ...p,
                        mode: e.target.value || undefined,
                      }))
                    }
                  >
                    <option value="">— Belum diatur —</option>
                    <option value="offline">Offline</option>
                    <option value="stateless">Stateless (NAV real-time)</option>
                  </select>
                </section>

                <section className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 space-y-3">
                  <h4 className="font-semibold text-purple-900">SOAP NAV</h4>
                  <input
                    type="url"
                    placeholder="Endpoint WSNav"
                    className="input input-bordered w-full bg-white"
                    value={soapForm.endpoint}
                    onChange={(e) =>
                      setSoapForm((p) => ({ ...p, endpoint: e.target.value }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Username NTLM"
                      className="input input-bordered bg-white"
                      value={soapForm.usernameNTLM}
                      onChange={(e) =>
                        setSoapForm((p) => ({
                          ...p,
                          usernameNTLM: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="password"
                      placeholder={
                        hasExistingSoapPassword
                          ? "Password (kosongkan jika tidak ubah)"
                          : "Password NTLM"
                      }
                      className="input input-bordered bg-white"
                      value={soapForm.passwordNTLM}
                      onChange={(e) =>
                        setSoapForm((p) => ({
                          ...p,
                          passwordNTLM: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="No Series"
                      className="input input-bordered bg-white"
                      value={soapForm.defaults.noSeries}
                      onChange={(e) =>
                        setSoapForm((p) => ({
                          ...p,
                          defaults: {
                            ...p.defaults,
                            noSeries: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </section>

                <section className="rounded-xl border border-green-100 bg-green-50/40 p-4 space-y-3">
                  <h4 className="font-semibold text-green-900 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Active Directory (global)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="AD Host"
                      className="input input-bordered bg-white"
                      value={adForm.AD_HOST}
                      onChange={(e) =>
                        setAdForm((p) => ({ ...p, AD_HOST: e.target.value }))
                      }
                    />
                    <input
                      type="number"
                      placeholder="AD Port"
                      className="input input-bordered bg-white"
                      value={adForm.AD_PORT}
                      onChange={(e) =>
                        setAdForm((p) => ({
                          ...p,
                          AD_PORT: Number(e.target.value) || 389,
                        }))
                      }
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="AD Domain"
                    className="input input-bordered w-full bg-white"
                    value={adForm.AD_DOMAIN}
                    onChange={(e) =>
                      setAdForm((p) => ({ ...p, AD_DOMAIN: e.target.value }))
                    }
                  />
                  <input
                    type="text"
                    placeholder="AD Base DN"
                    className="input input-bordered w-full bg-white"
                    value={adForm.AD_BASE_DN}
                    onChange={(e) =>
                      setAdForm((p) => ({ ...p, AD_BASE_DN: e.target.value }))
                    }
                  />
                </section>
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-gray-50 flex gap-2 shrink-0">
            <button
              type="button"
              className="btn btn-ghost flex-1"
              onClick={() =>
                document.getElementById("modalOutletEdit")?.close()
              }
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-error btn-outline"
              onClick={onDelete}
            >
              Hapus
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isSaving}
            >
              {isSaving ? "Menyimpan..." : "Simpan Semua"}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
        {Icon && <Icon className="w-4 h-4 text-blue-950" />}
        {label}
      </label>
      {children}
    </div>
  );
}

function PickerBlock({ label, icon: Icon, emptyText, onOpen, items }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
        {Icon && <Icon className="w-4 h-4 text-blue-950" />}
        {label}
      </label>
      <div
        onClick={onOpen}
        className="border rounded-xl bg-gray-50 px-4 py-3 cursor-pointer hover:border-blue-400"
      >
        {!items?.length ? (
          <span className="text-gray-400 text-sm">{emptyText}</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center bg-blue-100 text-blue-800 rounded-lg px-2 py-1 text-sm"
              >
                {item.label}
                {item.onRemove && (
                  <button
                    type="button"
                    className="ml-1 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onRemove();
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            <span className="text-blue-600 text-sm font-medium">+ Add</span>
          </div>
        )}
      </div>
    </div>
  );
}
