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

  // ------------ EDIT STATES ------------- //
  const [editModal, setEditModal] = useState(false);
  const [editProductData, setEditProductData] = useState<Product>({
    name: "",
    description: "",
    price: 0,
  });
  const [editFolderName, setEditFolderName] = useState<string>("");
  const [editImage, setEditImage] = useState<File | null>(null);

  // ADD ROW
  const addRow = () => {
    setProducts([...products, { name: "", description: "", price: 0 }]);
    setValidation([...validation, { name: true, price: true, description: true }]);
  };

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

  // UPLOAD PRODUCTS
  const handleUpload = async () => {
    if (!images) return alert("Please select images!");
    if (images.length !== products.length)
      return alert("Product count and image count must match!");

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
    if (!valid) return alert("Fill required fields!");

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
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
      });

      alert("Uploaded!");

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

  // LOAD PRODUCT LIST
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

    const folder = imageUrl.split("/")[0];
    if (!confirm("Delete this product?")) return;

    try {
      await axios.delete(`http://localhost:8080/api/products/delete/${folder}`);
      alert("Deleted!");
      loadProducts();
    } catch (err) {
      console.error(err);
      alert("Delete failed!");
    }
  };

  // OPEN EDIT MODAL
  const openEditModal = (p: Product) => {
    setEditProductData(p);
    setEditFolderName(p.imageUrl!.split("/")[0]);
    setEditModal(true);
  };

  // EDIT PRODUCT
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

      alert("Product updated!");
      setEditModal(false);
      setEditImage(null);
      loadProducts();
    } catch (err) {
      console.error(err);
      alert("Update failed!");
    }
  };

  // LOAD ON MOUNT
  useEffect(() => {
    loadProducts();
  }, []);

  const paginated = productList.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">

      {/* HEADER TITLE */}
      <h1 className="text-5xl font-bold text-center text-gray-900 mb-12 animate-fadeIn">
         Bulk Product Management
      </h1>

      {/* ADD PRODUCTS SECTION */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/30 animate-slideUp">
        <h2 className="text-xl font-semibold mb-6 text-gray-900">
          Add New Products
        </h2>

        <div className="space-y-6">
          {products.map((item, index) => (
            <div
              key={index}
              className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow hover:shadow-lg transition relative animate-fadeIn"
            >
              <h3 className="font-semibold text-lg mb-4 text-gray-800">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <input
                  type="text"
                  placeholder="Product Name"
                  className={`border p-3 rounded-lg shadow-sm ${
                    !validation[index].name ? "border-red-500" : "border-gray-300"
                  }`}
                  value={item.name}
                  onChange={(e) => handleChange(index, "name", e.target.value)}
                />

                <input
                  type="number"
                  placeholder="Price"
                  className={`border p-3 rounded-lg shadow-sm ${
                    !validation[index].price ? "border-red-500" : "border-gray-300"
                  }`}
                  value={item.price}
                  onChange={(e) => handleChange(index, "price", e.target.value)}
                />

                <textarea
                  placeholder="Description"
                  className={`border p-3 rounded-lg shadow-sm ${
                    !validation[index].description
                      ? "border-red-500"
                      : "border-gray-300"
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

      {/* UPLOAD IMAGES */}
      <div className="mt-10 bg-white/60 backdrop-blur-xl shadow-xl rounded-2xl p-8 border border-white/30 animate-slideUp">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
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
          <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
            <div
              className="bg-green-600 h-3 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        <button
          onClick={handleUpload}
          className="mt-4 bg-green-600 text-white px-7 py-3 rounded-lg shadow hover:bg-green-700 transition font-semibold"
        >
          {loading ? "Uploading..." : "Upload Products"}
        </button>
      </div>

      {/* PRODUCT LIST */}
      <h2 className="text-3xl font-bold mt-14 mb-6 text-gray-900 animate-fadeIn">
        Uploaded Products
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadeIn">
        {paginated.map((p) => (
          <div
            key={p.id}
            className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-lg border hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
          >
            {p.imageUrl && (
              <img
                src={`http://localhost:8080/${p.imageUrl}`}
                className="w-full h-48 object-cover rounded-xl cursor-pointer hover:opacity-90 transition"
                onClick={() =>
                  setFullscreenImage(`http://localhost:8080/${p.imageUrl}`)
                }
              />
            )}

            <h3 className="text-xl font-semibold mt-4">{p.name}</h3>
            <p className="text-gray-600">{p.description}</p>
            <p className="font-bold text-green-700">${p.price}</p>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => openEditModal(p)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
              >
                Edit
              </button>

              <button
                onClick={() => handleDelete(p.imageUrl)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex justify-center items-center mt-10 gap-4 animate-fadeIn">

        {/* Previous Button */}
        <button
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1}
          className={`px-5 py-2 rounded-lg shadow transition 
            ${page === 1 
              ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
              : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
        >
          ← Previous
        </button>

        {/* Page number */}
        <span className="px-5 py-2 bg-white/70 backdrop-blur-xl rounded-lg shadow font-semibold text-gray-800">
          Page {page} of {Math.ceil(productList.length / pageSize)}
        </span>

        {/* Next Button */}
        <button
          onClick={() =>
            setPage((prev) => 
              prev < Math.ceil(productList.length / pageSize) ? prev + 1 : prev
            )
          }
          disabled={page >= Math.ceil(productList.length / pageSize)}
          className={`px-5 py-2 rounded-lg shadow transition 
            ${page >= Math.ceil(productList.length / pageSize)
              ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
              : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
        >
          Next →
        </button>

      </div>

      {/* EDIT MODAL */}
      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center animate-fadeIn">
          <div className="bg-white p-8 rounded-2xl w/full max-w-lg shadow-xl scale-100 animate-zoomIn">
            <h2 className="text-2xl font-bold mb-5">Edit Product</h2>

            <input
              type="text"
              value={editProductData.name}
              onChange={(e) =>
                setEditProductData({ ...editProductData, name: e.target.value })
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

            <label className="font-semibold">Replace Image (optional):</label>
            <input
              type="file"
              className="w-full mt-2"
              onChange={(e) => setEditImage(e.target.files?.[0] || null)}
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
                className="px-5 py-2 bg-green-600 text-white rounded"
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
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center animate-fadeIn"
          onClick={() => setFullscreenImage(null)}
        >
          <img
            src={fullscreenImage}
            className="max-w-[90%] max-h-[90%] rounded-xl animate-zoomIn"
          />
        </div>
      )}
    </div>
  );
}
