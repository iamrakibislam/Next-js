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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pageSize = 6;

  // ➤ ADD ROW
  const addRow = () => {
    setProducts([...products, { name: "", description: "", price: 0 }]);
    setValidation([...validation, { name: true, price: true, description: true }]);
  };

  // ➤ REMOVE ROW
  const removeRow = (index: number) => {
    if (products.length === 1) return alert("At least one product is required!");
    const updated = [...products];
    updated.splice(index, 1);
    setProducts(updated);

    const valUpdated = [...validation];
    valUpdated.splice(index, 1);
    setValidation(valUpdated);
  };

  const handleChange = (index: number, field: keyof Product, value: string) => {
    const updated = [...products];
    switch (field) {
      case "price":
        updated[index][field] = Number(value) as Product[typeof field];
        break;
      case "name":
      case "description":
        updated[index][field] = value as Product[typeof field];
        break;
    }
    setProducts(updated);

    // Reset validation for this field
    const valUpdated = [...validation];
    valUpdated[index][field] = true;
    setValidation(valUpdated);
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImages(e.target.files);
  };

  const handleUpload = async () => {
    if (!images) return alert("Please select images!");
    if (images.length !== products.length)
      return alert("Product count and image count must match!");

    // ➤ VALIDATION
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
    if (!valid) return alert("Please fill all required fields correctly!");

    const formData = new FormData();
    formData.append(
      "data",
      new Blob([JSON.stringify(products)], { type: "application/json" })
    );
    Array.from(images).forEach((file) => formData.append("images", file));

    try {
      setLoading(true);
      setUploadProgress(0);

      await axios.post("http://localhost:8080/api/products/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
      });

      alert("Upload Successful!");

      // Reset
      setProducts([{ name: "", description: "", price: 0 }]);
      setValidation([{ name: true, price: true, description: true }]);
      setImages(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      loadProducts();
    } catch (err) {
      console.error(err);
      alert("Upload failed!");
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
    } catch (err) {
      console.error(err);
      alert("Failed to load products!");
    }
  };

  const handleDelete = async (imageUrl?: string) => {
    if (!imageUrl) return;

    const folderName = imageUrl.split("/")[0];
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await axios.delete(
        `http://localhost:8080/api/products/delete/${folderName}`
      );

      alert("Product deleted!");
      loadProducts();
    } catch (err) {
      console.error(err);
      alert("Delete failed!");
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const paginated = productList.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <h1 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-12">
        Bulk Product Management System
      </h1>

      {/* Add Products Form */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Add New Products
        </h2>

        <div className="space-y-6">
          {products.map((item, index) => (
            <div
              key={index}
              className="p-6 bg-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition relative"
            >
              <h3 className="font-semibold text-lg text-gray-700 mb-4">
                Product {index + 1}
              </h3>

              {products.length > 1 && (
                <button
                  onClick={() => removeRow(index)}
                  className="absolute top-4 right-4 text-white bg-red-600 px-3 py-1 rounded-lg shadow hover:bg-red-700 transition"
                >
                  Remove
                </button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Product Name"
                  className={`border p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                    !validation[index].name ? "border-red-500" : ""
                  }`}
                  value={item.name}
                  onChange={(e) => handleChange(index, "name", e.target.value)}
                />

                <input
                  type="number"
                  placeholder="Price"
                  className={`border p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                    !validation[index].price ? "border-red-500" : ""
                  }`}
                  value={item.price}
                  onChange={(e) => handleChange(index, "price", e.target.value)}
                />

                <textarea
                  placeholder="Description"
                  className={`border p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                    !validation[index].description ? "border-red-500" : ""
                  }`}
                  value={item.description}
                  onChange={(e) =>
                    handleChange(index, "description", e.target.value)
                  }
                />
              </div>
            </div>
          ))}

          <button
            onClick={addRow}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition font-semibold"
          >
            + Add Another Product
          </button>
        </div>
      </div>

      {/* Upload Images */}
      <div className="mt-10 bg-white shadow-lg rounded-2xl p-8 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Upload Product Images
        </h2>

        <input
          type="file"
          multiple
          className="mb-4"
          onChange={handleImages}
          ref={fileInputRef}
        />

        {uploadProgress > 0 && (
          <div className="w-full bg-gray-200 h-3 rounded-full">
            <div
              className="bg-green-600 h-3 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={loading}
          className="mt-4 bg-green-600 text-white px-7 py-3 rounded-lg shadow hover:bg-green-700 transition font-semibold"
        >
          {loading ? "Uploading..." : "Upload Products"}
        </button>
      </div>

      {/* Product List */}
      <h2 className="text-3xl font-bold mt-14 mb-6 text-gray-900">
        Uploaded Products
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginated.map((p) => (
          <div
            key={p.id}
            className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            {p.imageUrl && (
              <img
                src={`http://localhost:8080/${p.imageUrl}`}
                alt={p.name}
                className="w-full h-48 object-cover rounded-xl mb-4 cursor-pointer hover:opacity-90 transition"
                onClick={() =>
                  setFullscreenImage(`http://localhost:8080/${p.imageUrl}`)
                }
              />
            )}

            <h3 className="text-xl font-semibold text-gray-800">{p.name}</h3>
            <p className="text-gray-600 text-sm mt-1">{p.description}</p>

            <p className="mt-3 text-lg font-bold text-green-700">${p.price}</p>

            <div className="mt-5 flex justify-between">
              <button
                onClick={() => handleDelete(p.imageUrl)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-4 mt-10">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-5 py-2 bg-gray-300 rounded-lg disabled:bg-gray-200 hover:bg-gray-400 transition font-medium"
        >
          Prev
        </button>

        <button
          disabled={page * pageSize >= productList.length}
          onClick={() => setPage(page + 1)}
          className="px-5 py-2 bg-gray-300 rounded-lg disabled:bg-gray-200 hover:bg-gray-400 transition font-medium"
        >
          Next
        </button>
      </div>

      {/* FULLSCREEN IMAGE VIEWER */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999]"
          onClick={() => setFullscreenImage(null)}
        >
          <img
            src={fullscreenImage}
            className="max-w-[90%] max-h-[90%] rounded-xl shadow-2xl animate-[zoomIn_0.3s_ease]"
          />
        </div>
      )}
    </div>
  );
}
