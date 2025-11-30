"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";

interface Product {
  id?: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
}

interface Validation {
  name: boolean;
  price: boolean;
  description: boolean;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([
    { name: "", description: "", price: 0 },
  ]);
  const [validation, setValidation] = useState<Validation[]>([
    { name: true, price: true, description: true },
  ]);

  const [images, setImages] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [productList, setProductList] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const pageSize = 6;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchText, setSearchText] = useState("");

  const [editModal, setEditModal] = useState(false);
  const [editProductData, setEditProductData] = useState<Product>({
    name: "",
    description: "",
    price: 0,
  });
  const [editFolderName, setEditFolderName] = useState<string>("");
  const [editImage, setEditImage] = useState<File | null>(null);

  // ---------------------- TOAST STATE ----------------------
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
    animate: false,
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type, animate: false });

    setTimeout(() => setToast((t) => ({ ...t, animate: true })), 50);

    setTimeout(() => {
      setToast((t) => ({ ...t, animate: false }));
      setTimeout(
        () =>
          setToast({
            show: false,
            message: "",
            type: "success",
            animate: false,
          }),
        300
      );
    }, 2500);
  };
  // --------------------------------------------------------

  const addRow = () => {
    setProducts([...products, { name: "", description: "", price: 0 }]);
    setValidation([
      ...validation,
      { name: true, price: true, description: true },
    ]);
  };

  const removeRow = (index: number) => {
    if (products.length === 1)
      return showToast("At least one product is required!", "error");

    const updated = [...products];
    updated.splice(index, 1);
    setProducts(updated);

    const valUpdated = [...validation];
    valUpdated.splice(index, 1);
    setValidation(valUpdated);
  };

  const handleChange = (index: number, field: keyof Product, value: string) => {
    const updated = [...products];

    if (field === "price") {
      updated[index][field] = Number(value);
    } else {
      updated[index][field] = value;
    }

    setProducts(updated);

    const valUpdated = [...validation];
    valUpdated[index][field] = true;
    setValidation(valUpdated);
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImages(e.target.files);
  };

  const handleUpload = async () => {
    if (!images) return showToast("Please select images!", "error");
    if (images.length !== products.length)
      return showToast("Product count and image count must match!", "error");

    let valid = true;
    const valUpdated = [...validation];

    products.forEach((p, i) => {
      if (!p.name.trim()) {
        valUpdated[i].name = false;
        valid = false;
      }
      if (p.price <= 0) {
        valUpdated[i].price = false;
        valid = false;
      }
      if (!p.description.trim()) {
        valUpdated[i].description = false;
        valid = false;
      }
    });

    setValidation(valUpdated);
    if (!valid) return showToast("Fill required fields!", "error");

    const formData = new FormData();
    formData.append(
      "data",
      new Blob([JSON.stringify(products)], { type: "application/json" })
    );

    Array.from(images).forEach((file) => formData.append("images", file));

    try {
      setLoading(true);

      await axios.post("http://localhost:8080/api/products/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total)
            setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
      });

      showToast("Products uploaded successfully!", "success");

      setProducts([{ name: "", description: "", price: 0 }]);
      setValidation([{ name: true, price: true, description: true }]);
      setImages(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      loadProducts();
    } catch {
      showToast("Upload failed!", "error");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/products/list");
      setProductList(res.data);
      setPage(1);
    } catch {
      showToast("Failed to load products!", "error");
    }
  };

  const handleSearch = async () => {
    if (!searchText.trim()) {
      loadProducts();
      return;
    }

    try {
      const res = await axios.get("http://localhost:8080/api/products/search", {
        params: { name: searchText },
      });

      setProductList(res.data);
      setPage(1);
    } catch {
      showToast("Search failed!", "error");
    }
  };

  const handleDelete = async (imageUrl?: string) => {
    if (!imageUrl) return;

    const folder = imageUrl.split("/")[0];
    if (!confirm("Delete this product?")) return;

    try {
      await axios.delete(
        `http://localhost:8080/api/products/delete/${folder}`
      );

      showToast("Product deleted successfully!", "success");

      loadProducts();
    } catch {
      showToast("Delete failed!", "error");
    }
  };

  const openEditModal = (p: Product) => {
    setEditProductData(p);
    setEditFolderName(p.imageUrl!.split("/")[0]);
    setEditModal(true);
  };

  const saveEditedProduct = async () => {
    const formData = new FormData();
    formData.append("data", JSON.stringify(editProductData));
    if (editImage) formData.append("image", editImage);

    try {
      await axios.post(
        `http://localhost:8080/api/products/edit/${editFolderName}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      showToast("Product updated successfully!", "success");

      setEditModal(false);
      setEditImage(null);
      loadProducts();
    } catch {
      showToast("Update failed!", "error");
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const paginated = productList.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans animate-fadeIn">
      <h1 className="text-5xl font-bold text-center mb-10 animate-slideUp">
        Bulk Product Management
      </h1>

      {/* ADD SECTION */}
      <div className="bg-white p-7 rounded-xl shadow animate-slideUp">
        <h2 className="text-xl font-semibold mb-4">Add New Products</h2>

        <div className="space-y-6">
          {products.map((item, index) => (
            <div
              key={index}
              className="p-6 bg-gray-100 rounded-lg shadow relative animate-slideUp"
            >
              {products.length > 1 && (
                <button
                  onClick={() => removeRow(index)}
                  className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded transition hover:scale-105"
                >
                  Remove
                </button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Product Name"
                  value={item.name}
                  onChange={(e) =>
                    handleChange(index, "name", e.target.value)
                  }
                  className={`border p-3 rounded ${
                    !validation[index].name && "border-red-500"
                  }`}
                />

                <input
                  type="number"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) =>
                    handleChange(index, "price", e.target.value)
                  }
                  className={`border p-3 rounded ${
                    !validation[index].price && "border-red-500"
                  }`}
                />

                <textarea
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    handleChange(index, "description", e.target.value)
                  }
                  className={`border p-3 rounded ${
                    !validation[index].description && "border-red-500"
                  }`}
                />
              </div>
            </div>
          ))}

          <button
            onClick={addRow}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg transition hover:scale-105"
          >
            + Add Another Product
          </button>
        </div>
      </div>

      {/* UPLOAD SECTION */}
      <div className="mt-8 bg-white p-7 rounded-xl shadow animate-slideUp">
        <h2 className="text-xl font-semibold mb-3">Upload Product Images</h2>

        <input type="file" multiple onChange={handleImages} ref={fileInputRef} />

        {uploadProgress > 0 && (
          <div className="w-full bg-gray-200 h-3 mt-2 rounded">
            <div
              className="bg-green-600 h-3 rounded"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        <button
          onClick={handleUpload}
          className="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg transition hover:scale-105"
        >
          {loading ? "Uploading..." : "Upload Products"}
        </button>
      </div>

      {/* PRODUCT LIST */}
      <h2 className="text-3xl font-bold mt-14 mb-4 animate-slideUp">
        Uploaded Products
      </h2>

      <div className="flex items-center gap-3 mb-6 animate-slideUp">
        <input
          type="text"
          placeholder="Search by product name..."
          className="border p-3 rounded-xl shadow w-80"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-5 py-3 rounded-xl shadow hover:scale-105"
        >
          Search
        </button>

        <button
          onClick={() => {
            setSearchText("");
            loadProducts();
          }}
          className="bg-gray-500 text-white px-5 py-3 rounded-xl shadow hover:scale-105"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginated.map((p, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-lg shadow transition hover:scale-105"
          >
            {p.imageUrl && (
              <img
                src={`http://localhost:8080/${p.imageUrl}`}
                className="w-full h-48 object-cover rounded cursor-pointer hover:scale-105"
                onClick={() =>
                  setFullscreenImage(`http://localhost:8080/${p.imageUrl}`)
                }
              />
            )}

            <h3 className="text-xl font-semibold mt-3">{p.name}</h3>
            <p>{p.description}</p>
            <p className="font-bold text-green-700">${p.price}</p>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => openEditModal(p)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:scale-105"
              >
                Edit
              </button>

              <button
                onClick={() => handleDelete(p.imageUrl)}
                className="bg-red-600 text-white px-4 py-2 rounded hover:scale-105"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex justify-center items-center mt-8 gap-3 animate-slideUp">
        <button
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 hover:scale-105"
        >
          Previous
        </button>

        <span>
          Page {page} of {Math.ceil(productList.length / pageSize)}
        </span>

        <button
          onClick={() =>
            setPage((prev) =>
              prev < Math.ceil(productList.length / pageSize)
                ? prev + 1
                : prev
            )
          }
          disabled={page >= Math.ceil(productList.length / pageSize)}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 hover:scale-105"
        >
          Next
        </button>
      </div>

      {/* EDIT MODAL */}
      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl w-full max-w-lg animate-slideUp">
            <h2 className="text-2xl font-bold mb-5">Edit Product</h2>

            <input
              type="text"
              value={editProductData.name}
              onChange={(e) =>
                setEditProductData({
                  ...editProductData,
                  name: e.target.value,
                })
              }
              className="w-full border p-3 rounded mb-3"
            />

            <textarea
              value={editProductData.description}
              onChange={(e) =>
                setEditProductData({
                  ...editProductData,
                  description: e.target.value,
                })
              }
              className="w-full border p-3 rounded mb-3"
            />

            <input
              type="number"
              value={editProductData.price}
              onChange={(e) =>
                setEditProductData({
                  ...editProductData,
                  price: Number(e.target.value),
                })
              }
              className="w-full border p-3 rounded mb-3"
            />

            <label>Replace Image (optional):</label>
            <input
              type="file"
              className="w-full mt-2"
              onChange={(e) =>
                setEditImage(e.target.files?.[0] || null)
              }
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setEditModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>

              <button
                onClick={saveEditedProduct}
                className="px-5 py-2 bg-green-600 text-white rounded hover:scale-105"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center"
          onClick={() => setFullscreenImage(null)}
        >
          <img
            src={fullscreenImage}
            className="max-w-[90%] max-h-[90%] rounded"
          />
        </div>
      )}

      {/* ---------- TOAST UI ---------- */}
      {toast.show && (
        <div
          className={`
            fixed top-6 right-6 px-5 py-3 rounded-lg shadow-xl text-white text-lg
            transition-all duration-500 transform
            ${
              toast.type === "success"
                ? "bg-green-600"
                : "bg-red-600"
            }
            ${toast.animate
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-10"}
          `}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
