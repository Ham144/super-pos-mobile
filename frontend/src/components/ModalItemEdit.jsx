import { Info } from "lucide-react";
import React, { useState } from "react";
import { Toaster } from "react-hot-toast";

export const ModalItemEdit = ({ onConfirm, selectedItem, setSelectedItem }) => {
  const [selectedItemReceivedOld, setSelectedItemReceivedOld] = useState();

  const completeReceived = () => {
    setSelectedItem((prev) => ({
      ...prev,
      received: prev.request,
    }));
  };

  const updateReceived = (num) => {
    setSelectedItem((prev) => ({
      ...prev,
      received: Number(prev.received + num),
    }));
  };

  return (
    <dialog id="editItemModal" className="modal">
      <Toaster />
      <div className="modal-box">
        {selectedItem && (
          <>
            {/* Judul Modal: SKU */}
            <h3 className="font-bold text-lg mb-4">
              Edit Item:
              <span className="badge badge-info ml-2">{selectedItem.sku}</span>
            </h3>

            {/* Form Edit */}
            <div className="space-y-4">
              {/* Request (hanya ditampilkan) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Request
                </label>
                <input
                  min={selectedItemReceivedOld}
                  type="number"
                  value={selectedItem.request || 0}
                  disabled
                  className="input input-bordered w-full bg-gray-100"
                />
              </div>

              {/* Received (dengan tombol plus dan minus) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Received (Jika anda Mengurangi atau menambah, maka quantity
                  inventory akan terpengaruh langsung saat confirm)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={selectedItem.received <= selectedItemReceivedOld}
                    onClick={() => updateReceived(-1)}
                    className="btn btn-sm btn-outline btn-error"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={selectedItem.received}
                    onChange={(e) =>
                      setSelectedItem({
                        ...selectedItem,
                        received: e.target.value,
                      })
                    }
                    className="input input-bordered w-full text-center"
                    min="0"
                    max={selectedItem.request}
                  />
                  <button
                    type="button"
                    disabled={selectedItem.received >= selectedItem.request}
                    onClick={() => updateReceived(1)}
                    className="btn btn-sm btn-outline btn-success"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Tersisa (request - received) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tersisa
                </label>
                <input
                  type="number"
                  value={
                    (selectedItem.request || 0) - (selectedItem.received || 0)
                  }
                  disabled
                  className="input input-bordered w-full bg-gray-100"
                />
              </div>

              {/* Keterangan */}
              {selectedItem.keterangan && (
                <div className="alert alert-info shadow-lg w-full">
                  <div className="flex items-center gap-2">
                    <Info />
                    <span>{selectedItem.keterangan}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Aksi */}
            <div className="modal-action mt-6 flex gap-2">
              <button
                type="button"
                onClick={completeReceived}
                className="btn btn-warning"
              >
                Complete This
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="btn btn-primary"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => {
                  document.getElementById("editItemModal").close();
                  setSelectedItem(null);
                }}
                className="btn btn-outline btn-error"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
};
