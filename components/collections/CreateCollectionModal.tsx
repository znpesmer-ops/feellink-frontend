"use client";
import { useState } from "react";
import { X, Image, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCollectionModal({ isOpen, onClose, onCreated }: CreateCollectionModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCoverImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Koleksiyon başlığı gerekli.");
      return;
    }

    setLoading(true);
    try {
      let coverUrl = null;

      if (coverImage) {
        const formData = new FormData();
        formData.append("file", coverImage);
        const upload = await api.post("/media/upload?type=image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        coverUrl = upload.data.url;
      }

      console.log("🔄 Koleksiyon oluşturuluyor:", { title, description, coverImage: coverUrl });
      const response = await api.post("/collections", {
        title,
        description,
        coverImage: coverUrl,
      });
      console.log("✅ Koleksiyon oluşturuldu:", response.data);

      onCreated(); // Refresh list
      onClose(); // Close modal
      setTitle("");
      setDescription("");
      setCoverImage(null);
    } catch (err: any) {
      console.error("❌ Koleksiyon oluşturulamadı:", err);
      console.error("Error response:", err?.response?.data);
      console.error("Error status:", err?.response?.status);
      const errorMessage = err?.response?.data?.message || "Bir hata oluştu.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 transition-all">
      <div className="bg-white dark:bg-[#1a1a1a]/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg p-6 relative border border-gray-200 dark:border-gray-700/40">
        {/* Kapatma butonu */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-[#ff7b00] transition-colors"
        >
          <X size={22} />
        </button>

        <h2 className="text-2xl font-semibold text-[#ff7b00] mb-4">
          🎨 Yeni Koleksiyon Oluştur
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Kapak Görseli
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center justify-center w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                {coverImage ? (
                  <img
                    src={URL.createObjectURL(coverImage)}
                    alt="preview"
                    className="object-cover w-full h-full rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <Image size={24} />
                    <span className="text-xs">Yükle</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {coverImage && (
                <span className="text-xs text-gray-500 line-clamp-1 max-w-32">
                  {coverImage.name}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Başlık *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              placeholder="Koleksiyon başlığı..."
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              placeholder="Bu koleksiyonun içeriği hakkında kısa bilgi..."
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="bg-[#ff7b00] hover:bg-[#e36f00] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 rounded-xl mt-3 transition flex justify-center items-center font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Kaydediliyor...
              </>
            ) : (
              "Kaydet"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

