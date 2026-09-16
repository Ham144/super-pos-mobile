import { deleteCustomer, getAllCustomer } from "@/api/customerApi";
import ModalEditCustomer from "@/components/ModalEditCustomer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function Customer_list() {
  //states
  const [selectedCustomer, setSelectedCustomer] = useState(); //object
  
  //tanstack query
  const queryClient = useQueryClient();
  const { data: customerList } = useQuery({
    queryKey: ["customer"],
    queryFn: () => getAllCustomer(),
  });

  const { mutate: handleDeleteCustomer } = useMutation({
    mutationKey: ["customer"],
    mutationFn: (id) => deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      toast.success("Customer berhasil dihapus");
    },
    onError: () => {
      toast.error("Gagal menghapus customer");
    },
  });
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-items-center">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">Customer List</h1>
          </div>
        </div>
        <div class="overflow-x-auto shadow-lg rounded-lg">
          <table class="table w-full">
            <thead class="bg-gradient-to-r from-blue-950 to-blue-700 text-white">
              <tr>
                <th class="p-4 text-left text-sm font-semibold uppercase tracking-wider rounded-tl-lg">
                  Nama
                </th>
                <th class="p-4 text-left text-sm font-semibold uppercase tracking-wider">
                  No HP.
                </th>
                <th class="p-4 text-left text-sm font-semibold uppercase tracking-wider">
                  Email
                </th>
                <th class="p-4 text-left text-sm font-semibold uppercase tracking-wider">
                  Alamat
                </th>
                <th class="p-4 text-center text-sm font-semibold uppercase tracking-wider rounded-tr-lg">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {customerList?.data?.map((customer, index) => (
                <tr
                  key={customer._id}
                  class="hover:bg-gray-100 transition-colors duration-200 ease-in-out border-b border-gray-200"
                >
                  <td class="p-4 text-sm text-gray-800">
                    {customer.name || "Tidak Ada Nama"}
                  </td>
                  <td class="p-4 text-sm text-gray-800">
                    {customer.phone || "Tidak Ada No HP"}
                  </td>
                  <td class="p-4 text-sm text-gray-800">
                    {customer.email || "Tidak Ada Email"}
                  </td>
                  <td class="p-4 text-sm text-gray-800">
                    {customer.alamat || "Tidak Ada Alamat"}
                  </td>
                  <td class="p-4 flex gap-3 justify-center items-center">
                    <button
                      class="btn btn-sm btn-info text-white hover:bg-blue-600 transition-colors duration-200 ease-in-out transform hover:scale-105"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(customer?._id)}
                      class="btn btn-sm btn-error text-white hover:bg-red-600 transition-colors duration-200 ease-in-out transform hover:scale-105"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ModalEditCustomer
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
      />
    </div>
  );
}
