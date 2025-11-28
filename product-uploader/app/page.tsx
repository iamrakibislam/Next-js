"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface Product {
  id?: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([
    { name: "", description: "", price: 0 },
  ]);
  const [images, setImages] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [productList, setProductList] = useState<Product[]>([]);
  const [page, setPage] = useState(1);

  const pageSize = 5;

  // Add new product row
  const addRow = () =>
    setProducts([...products, { name: "", description: "", price: 0 }]);

  // Type-safe handleChange
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
      default:
        break; // ignore other fields
    }

    setProducts(updated);
  };

  // Handle file input
  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImages(e.target.files);
  };

  // Upload products and images
  const handleUpload = async () => {
    if (!images) return alert("Please select images!");
    if (images.length !== products.length)
      return alert("Product count and image count must match!");

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
          if (e.total) {
            setUploadProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });

      alert("Upload Successful!");
      setProducts([{ name: "", description: "", price: 0 }]);
      setImages(null);
      loadProducts();
    } catch (err) {
      console.error(err);
      alert("Upload failed!");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Load all products
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

  // Delete product
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

  const paginated = productList.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">

      <h1 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-12 tracking-tight">
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
              className="p-6 bg-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition"
            >
              <h3 className="font-semibold text-lg text-gray-700 mb-4">
                Product {index + 1}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Product Name"
                  className="border p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={item.name}
                  onChange={(e) => handleChange(index, "name", e.target.value)}
                />

                <input
                  type="number"
                  placeholder="Price"
                  className="border p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={item.price}
                  onChange={(e) => handleChange(index, "price", e.target.value)}
                />

                <textarea
                  placeholder="Description"
                  className="border p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
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

        <input type="file" multiple className="mb-4" onChange={handleImages} />

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

      <div className="space-y-6">
        {paginated.map((p) => (
          <div
            key={p.id}
            className="flex flex-col md:flex-row justify-between items-start gap-6 bg-white p-6 rounded-2xl shadow border border-gray-200 hover:shadow-lg transition"
          >
            <div className="space-y-1">
              <p><span className="font-semibold">ID:</span> {p.id}</p>
              <p><span className="font-semibold">Name:</span> {p.name}</p>
              <p><span className="font-semibold">Description:</span> {p.description}</p>
              <p><span className="font-semibold">Price:</span> ${p.price}</p>

              {p.imageUrl && (
                <img
                  src={`http://localhost:8080/${p.imageUrl}`}
                  alt={p.name}
                  className="mt-3 max-h-44 rounded-xl border shadow"
                />
              )}
            </div>

            <button
              onClick={() => handleDelete(p.imageUrl)}
              className="bg-red-600 text-white px-5 py-2 rounded-lg shadow hover:bg-red-700 transition font-semibold"
            >
              Delete
            </button>
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
    </div>
  );
}
