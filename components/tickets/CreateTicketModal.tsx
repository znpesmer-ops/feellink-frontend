"use client";
import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onCreated?: () => void;
}

export default function CreateTicketModal({ isOpen, onClose, eventId, onCreated }: CreateTicketModalProps) {
  const [type, setType] = useState("");
  const [price, setPrice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !price || !capacity) {
      alert("Tüm alanlar zorunludur.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/tickets", {
        eventId,
        type,
        price: parseFloat(price),
        capacity: parseInt(capacity),
      });
      alert("Bilet başarıyla eklendi!");
      setType("");
      setPrice("");
      setCapacity("");
      onCreated?.();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Bilet eklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white dark:bg-[#1a1a1a]/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md p-6 relative border border-gray-200 dark:border-gray-700/40">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-[#ff7b00] transition-colors"
        >
          <X size={22} />
        </button>

        <h2 className="text-2xl font-semibold text-[#ff7b00] mb-4">
          🎟️ Yeni Bilet Ekle
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Bilet Türü *</label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              placeholder="Örn: Genel Giriş"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Fiyat (₺) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              placeholder="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Kapasite *</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              placeholder="100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !type || !price || !capacity}
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

