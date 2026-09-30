import React, { useState, useMemo, useEffect } from "react";
import MenuNavigation from "../components/MenuNavigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllDocuments,
  getDocumentById,
  uploadDocument,
} from "../api/documentApi";
import {
  Upload,
  Lock,
  Loader2,
  Search,
  Clock,
  Filter,
  Download,
  FileText,
  BookOpen,
  User,
  Tag,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import "./Artikel_Documentation.css";
import { useUserInfo } from "@/store";

const Artikel_Documentation = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("Uncategorized");
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  //dapatkan query search kalau ada
  const searchParams = new URLSearchParams(window.location.search);
  const search = searchParams.get("search");

  const { userInfo } = useUserInfo();

  const { data, isLoading, error } = useQuery({
    queryKey: ["documents"],
    queryFn: getAllDocuments,
    onError: (err) => {
      console.error("Error fetching documents:", err);
      toast.error("Failed to load documents");
    },
  });

  // Handle documents securely
  const documents = data?.documents || [];

  // Ekstrak semua kategori unik untuk filter
  const categories = useMemo(() => {
    const uniqueCategories = new Set();
    documents.forEach((doc) => {
      uniqueCategories.add(doc.category || "Uncategorized");
    });
    return Array.from(uniqueCategories);
  }, [documents]);

  // Filter dokumen berdasarkan pencarian dan kategori
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const titleMatch = doc.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const categoryMatch = activeFilter
        ? (doc.category || "Uncategorized") === activeFilter
        : true;
      return titleMatch && categoryMatch;
    });
  }, [documents, searchQuery, activeFilter]);

  const uploadMutation = useMutation({
    mutationFn: ({ file, category }) => {
      const formData = new FormData();

      formData.append("document", file);
      formData.append("category", category);
      formData.append("username", userInfo?.username);
      return uploadDocument(formData);
    },
    onSuccess: (data) => {
      toast.success("Document uploaded successfully");
      setSelectedFile(null);
      queryClient.invalidateQueries(["documents"]);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Error uploading document",
      );
    },
  });

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      toast.error("No file selected");
      return;
    }

    if (file.name.endsWith(".docx")) {
      setSelectedFile(file);
    } else {
      toast.error("Please select a valid .docx file");
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    uploadMutation.mutate({ file: selectedFile, category });
  };

  const handleDocumentClick = async (docId) => {
    try {
      const response = await getDocumentById(docId);
      if (response && response.document) {
        setSelectedDoc(response.document);
      } else {
        toast.error("Invalid document data received");
      }
    } catch (error) {
      console.error("Error loading document:", error);
      toast.error("Error loading document");
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      if (!response || !response.fileData) {
        throw new Error("Invalid file data received");
      }

      // Create a download link for the base64 data
      const link = document.createElement("a");
      link.href = response.fileData;
      link.download = response.fileName || "document.docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsDownloading(false);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Error downloading document");
      setIsDownloading(false);
    }
  };

  const handleFilterClick = (category) => {
    setActiveFilter(activeFilter === category ? "" : category);
  };

  useEffect(() => {
    if (search) {
      setSearchQuery(search);
    }
  }, [search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white pt-20">
      <MenuNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 px-5  py-5 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Dokumentasi</h1>
                <p className="text-gray-500 mt-1">
                  Kelola dan akses semua dokumentasi teknis dalam satu tempat
                </p>
              </div>
            </div>

            {userInfo?.username ? (
              <label className="cursor-pointer">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
                  <input
                    type="file"
                    className="hidden"
                    accept=".docx"
                    te
                    onChange={handleFileChange}
                    disabled={uploadMutation.isLoading}
                  />
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">Upload .docx</span>
                </div>
              </label>
            ) : (
              <div className="bg-gray-100 text-gray-500 px-6 py-3 rounded-xl flex items-center gap-2 cursor-not-allowed">
                <Lock className="w-5 h-5" />
                <span className="font-medium">Login untuk Upload</span>
              </div>
            )}
          </div>
        </div>

        {/* Upload Form */}
        {uploadMutation.isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-gray-500 font-medium">Mengupload dokumen...</p>
            </div>
          </div>
        )}

        {selectedFile && !uploadMutation.isLoading && (
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Upload Document: {selectedFile.name}
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Tag className="w-4 h-4 text-blue-600" />
                  Category
                </label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all bg-white"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Uncategorized">Uncategorized</option>
                  <option value="Mobile App">Mobile App</option>
                  <option value="CMS">CMS</option>
                  <option value="IT Technical">IT Technical</option>
                  <option value="Pemecahan Masalah Sementara">
                    Pemecahan Masalah Sementara
                  </option>
                </select>
              </div>

              <button
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                onClick={handleUpload}
                disabled={uploadMutation.isLoading}
              >
                <Upload className="w-4 h-4" />
                Upload Document
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document List - Left Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden sticky top-4">
              <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-600 to-blue-700">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Dokumen
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all"
                    placeholder="Cari dokumen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Category Filters */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Filter Kategori:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          activeFilter === cat
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        onClick={() => handleFilterClick(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                    {activeFilter && (
                      <button
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all flex items-center gap-1"
                        onClick={() => setActiveFilter("")}
                      >
                        <XCircle className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Document List Items */}
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                ) : error ? (
                  <div className="bg-red-50 p-4 rounded-xl text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>Gagal memuat dokumen. Silakan coba lagi.</span>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">
                      {documents.length === 0
                        ? "Belum ada dokumen. Upload dokumen untuk memulai."
                        : "Tidak ada dokumen yang sesuai dengan pencarian."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {filteredDocuments.map((doc) => (
                      <div
                        key={doc._id}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedDoc?._id === doc._id
                            ? "border-blue-600 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                        }`}
                        onClick={() => handleDocumentClick(doc._id)}
                      >
                        <h3 className="font-medium text-gray-800 mb-2 line-clamp-2">
                          {doc.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          <User className="w-3 h-3" />
                          <span>{doc.uploadedBy || "Unknown"}</span>
                          <Clock className="w-3 h-3 ml-1" />
                          <span>
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                          {doc.category || "Uncategorized"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Document Content - Right Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden h-full">
              {selectedDoc ? (
                <>
                  <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-600 to-blue-700">
                    <h2 className="text-xl font-bold text-white break-words">
                      {selectedDoc.title}
                    </h2>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                        {selectedDoc.category || "Uncategorized"}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>
                          Uploaded on{" "}
                          {new Date(selectedDoc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div
                      className="prose max-w-none mb-8 content-body"
                      dangerouslySetInnerHTML={{
                        __html: selectedDoc.content || "",
                      }}
                    />

                    <div className="flex justify-center pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleDownload(selectedDoc._id)}
                        disabled={isDownloading}
                        className="px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Mengunduh...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Download Original Document</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[600px] p-8 text-center">
                  <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <BookOpen className="w-12 h-12 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Belum Ada Dokumen Dipilih
                  </h3>
                  <p className="text-gray-500 max-w-md">
                    Pilih dokumen dari daftar di samping untuk melihat kontennya
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Artikel_Documentation;
