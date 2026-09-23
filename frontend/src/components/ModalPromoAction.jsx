import React from "react";

const ModalPromoAction = ({
  selectedPromo,
  setSelectedPromo,
  setPromoBaru,
  setEditingPromo,
  setShowPemilihanTerhubung,
  handleAturUlangBarangTerkait,
}) => {
  return (
    <dialog id="promoActions" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Pilihan Aksi Promo</h3>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              setEditingPromo(true);
              setShowPemilihanTerhubung(false);
              document.getElementById("promoActions").close();
            }}
            className="btn btn-ghost w-full text-left hover:bg-gray-100"
          >
            Edit Ketentuan Promo
          </button>
          <button
            onClick={() => {
              handleAturUlangBarangTerkait(selectedPromo);
              document.getElementById("promoActions").close();
            }}
            className="btn btn-ghost w-full text-left hover:bg-gray-100"
          >
            Atur Ulang Barang Terkait
          </button>
          <button
            onClick={() => {
              document.getElementById("modal_confirmation").showModal();
            }}
            className="btn btn-ghost w-full text-left hover:bg-red-100 hover:text-red-600"
          >
            Hapus Promo
          </button>
        </div>
        <div className="modal-action">
          <form method="dialog">
            <button
              className="btn"
              onClick={() => {
                setSelectedPromo(null);
                setPromoBaru(null);
                setEditingPromo(false);
                setShowPemilihanTerhubung(true);
                document.getElementById("promoActions").close();
              }}
            >
              Tutup
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
};

export default ModalPromoAction;
