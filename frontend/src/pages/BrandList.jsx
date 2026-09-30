import { getAllBrands } from "@/api/brandApi";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInventoryById } from "@/api/itemLibraryApi";

const BrandList = () => {
  const navigate = useNavigate();
  const [selectedSku, setSelectedSku] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    data: brandList,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["brand"],
    queryFn: getAllBrands,
  });

  const { data: skuDetails, isLoading: isLoadingSku } = useQuery({
    queryKey: ["inventory", selectedSku],
    queryFn: () => (selectedSku ? getInventoryById(selectedSku) : null),
    enabled: !!selectedSku,
  });

  //states
  const [search, setSearch] = useState("");

  // State to track which brand's SKU list is expanded
  const [expandedBrand, setExpandedBrand] = useState(null);

  // Toggle SKU list visibility
  const toggleBrand = (brandId) => {
    setExpandedBrand(expandedBrand === brandId ? null : brandId);
  };

  const handleSkuClick = async (sku) => {
    setSelectedSku(sku);
    setIsDialogOpen(true);
  };

  const handleEditClick = (sku) => {
    navigate(`/item_library?searchKey=${sku}`);
    setIsDialogOpen(false);
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Error: {error?.response?.data?.message || "Error loading brand list"}
      </div>
    );

  //filter brand list
  const filteredBrandList = brandList?.data?.data?.filter((brand) =>
    brand.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Brands</h1>

        {/* Search Bar (Optional Enhancement) */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search brands..."
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-950"
            onChange={(e) => setSearch(e.target.value)}
            value={search}
          />
        </div>

        {/* Brand List */}
        <div className="space-y-4">
          {filteredBrandList?.map((brand) => (
            <div
              key={brand._id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              {/* Brand Header */}
              <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleBrand(brand._id)}
              >
                <h2 className="text-xl font-semibold text-gray-700">
                  {brand.name}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {brand.skuList.length} SKUs
                  </span>
                  <svg
                    className={`w-5 h-5 transform transition-transform ${
                      expandedBrand === brand._id ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {/* SKU List (Collapsible) */}
              {expandedBrand === brand._id && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">
                    SKU List
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {brand.skuList.map((sku, index) => (
                      <div
                        key={index}
                        className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded cursor-pointer hover:bg-blue-200 transition-colors"
                        onClick={() => handleSkuClick(sku)}
                      >
                        {sku}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SKU Details Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                SKU Details
              </h3>
              <button
                onClick={() => setIsDialogOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {isLoadingSku ? (
              <div className="flex justify-center items-center h-32">
                Loading...
              </div>
            ) : skuDetails ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">SKU</p>
                  <p className="text-gray-900">{skuDetails.data?._id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Description
                  </p>
                  <p className="text-gray-900">
                    {skuDetails.data?.description || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Quantity</p>
                  <p className="text-gray-900">
                    {skuDetails.data?.quantity || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Base Price
                  </p>
                  <p className="text-gray-900">
                    {skuDetails.data?.hargaDasar || 0}
                  </p>
                </div>
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => handleEditClick(selectedSku)}
                    className="bg-blue-950 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    Edit in Item Library
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">No data available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandList;
