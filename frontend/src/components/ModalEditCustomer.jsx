import { deleteCustomer, editCustomer } from "@/api/customerApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export default function ModalEditCustomer({
  selectedCustomer,
  setSelectedCustomer,
}) {
  //tanstack
  const queryClient = useQueryClient();
  const { mutate: editCustomerMutation } = useMutation({
    mutationKey: ["customer"],
    mutationFn: (data) => editCustomer(selectedCustomer?._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      closeModal();
    },
  });

  useEffect(() => {
    if (selectedCustomer?._id) {
      document.getElementById("editCustomerDialog").showModal();
    }
  }, [selectedCustomer]);

  const closeModal = () => {
    document.getElementById("editCustomerDialog").close();
    setSelectedCustomer(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    editCustomerMutation(selectedCustomer);
  };

  return (
    <>
      <dialog id="editCustomerDialog" className="modal modal-middle">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="modal-header flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-gray-800">
              Edit Customer Details
            </h3>
            <button
              onClick={closeModal}
              className="btn btn-circle btn-outline btn-sm"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          <form method="dialog" onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label" htmlFor="customerName">
                <span className="label-text font-medium">Full Name</span>
              </label>
              <input
                id="customerName"
                type="text"
                placeholder="Enter customer name"
                className="input input-bordered w-full"
                value={selectedCustomer?.name || ""}
                onChange={(e) =>
                  setSelectedCustomer({
                    ...selectedCustomer,
                    name: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label" htmlFor="customerPhone">
                  <span className="label-text font-medium">Phone Number</span>
                </label>
                <input
                  id="customerPhone"
                  type="text"
                  placeholder="Enter phone number"
                  className="input input-bordered w-full"
                  value={selectedCustomer?.phone || ""}
                  onChange={(e) =>
                    setSelectedCustomer({
                      ...selectedCustomer,
                      phone: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-control">
                <label className="label" htmlFor="customerEmail">
                  <span className="label-text font-medium">Email Address</span>
                </label>
                <input
                  id="customerEmail"
                  type="email"
                  placeholder="Enter email address"
                  className="input input-bordered w-full"
                  value={selectedCustomer?.email || ""}
                  onChange={(e) =>
                    setSelectedCustomer({
                      ...selectedCustomer,
                      email: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label" htmlFor="customerAddress">
                <span className="label-text font-medium">Address</span>
              </label>
              <textarea
                id="customerAddress"
                placeholder="Enter full address"
                className="textarea textarea-bordered w-full h-24"
                value={selectedCustomer?.alamat || ""}
                onChange={(e) =>
                  setSelectedCustomer({
                    ...selectedCustomer,
                    alamat: e.target.value,
                  })
                }
              />
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={closeModal}
                className="btn btn-ghost mr-2"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
