"use client";
import { useState, useEffect } from "react";
import { X, Image, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";

// Tarih yardımcı fonksiyonları
const differenceInMonths = (date1: Date, date2: Date): number => {
  const yearDiff = date1.getFullYear() - date2.getFullYear();
  const monthDiff = date1.getMonth() - date2.getMonth();
  return yearDiff * 12 + monthDiff;
};

const isSameMonth = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
};

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateEventModal({ isOpen, onClose, onCreated }: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [limitError, setLimitError] = useState<string | null>(null);
  const { user, capabilities } = useAuthStore();

  // Kullanıcının etkinliklerini çek
  useEffect(() => {
    if (isOpen && user) {
      api.get("/events/my")
        .then((res) => setMyEvents(res.data || []))
        .catch(() => setMyEvents([]));
    }
  }, [isOpen, user]);

  // Limit kontrolü fonksiyonu
  const canCreateEvent = (): { allowed: boolean; message?: string } => {
    if (!user || !capabilities) {
      return { allowed: false, message: "Kullanıcı bilgileri yükleniyor..." };
    }

    const roles = capabilities.roles || user.roles || [];
    const plan = capabilities.plan || user.plan || "FREE";
    const primaryRole = roles[0] || "art_lover";

    // Sanatçı Pro: Sınırsız
    if (primaryRole === "artist" && plan === "PRO") {
      return { allowed: true };
    }

    const now = new Date();

    // ✅ 6 aylık etkinlik limiti kaldırıldı - artık sınırsız
    // Sanatsever Free: Artık sınırsız
    // if (primaryRole === "art_lover" && plan === "FREE") {
    //   if (myEvents.length === 0) {
    //     return { allowed: true };
    //   }
    //   // En son etkinliği bul
    //   const sortedEvents = [...myEvents].sort(
    //     (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    //   );
    //   const lastEvent = sortedEvents[0];
    //   if (lastEvent) {
    //     const diff = differenceInMonths(now, new Date(lastEvent.createdAt));
    //     if (diff < 6) {
    //       return {
    //         allowed: false,
    //         message: `6 ayda bir etkinlik oluşturabilirsiniz. Son etkinliğinizden ${6 - diff} ay sonra tekrar deneyebilirsiniz.`,
    //       };
    //     }
    //   }
    //   return { allowed: true };
    // }

    // Kurumsal Free: Ayda 30
    if (primaryRole === "corporate" && plan === "FREE") {
      const thisMonthEvents = myEvents.filter((e) =>
        isSameMonth(new Date(e.createdAt), now)
      );
      if (thisMonthEvents.length >= 30) {
        return {
          allowed: false,
          message: "Bu ay 30 etkinlik oluşturma limitinize ulaştınız. Gelecek ay tekrar deneyebilirsiniz.",
        };
      }
      return { allowed: true };
    }

    // Koleksiyoner Free ve Sanatçı Free: Ayda 5
    if ((primaryRole === "collector" || primaryRole === "artist") && plan === "FREE") {
      const thisMonthEvents = myEvents.filter((e) =>
        isSameMonth(new Date(e.createdAt), now)
      );
      if (thisMonthEvents.length >= 5) {
        return {
          allowed: false,
          message: "Bu ay 5 etkinlik oluşturma limitinize ulaştınız. Gelecek ay tekrar deneyebilirsiniz.",
        };
      }
      return { allowed: true };
    }

    // Diğer durumlar için varsayılan olarak izin ver
    return { allowed: true };
  };

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCoverImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limit kontrolü
    const limitCheck = canCreateEvent();
    if (!limitCheck.allowed) {
      setLimitError(limitCheck.message || "Etkinlik oluşturma limitinize ulaştınız.");
      return;
    }
    setLimitError(null);

    if (!title.trim() || !date.trim()) {
      alert("Etkinlik adı ve tarihi gerekli.");
      return;
    }

    // Ücretli etkinlik için fiyat kontrolü
    if (!isFree && (!price || price < 1 || price > 10000)) {
      alert("Ücretli etkinlik için 1 ₺ ile 10.000 ₺ arasında bir fiyat girmelisiniz.");
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

      // Tarih ve saat birleştirme
      const dateTime = time ? `${date}T${time}` : date;

      // Payload oluştur - undefined değerleri kaldır
      const payload: any = {
        title: title.trim(),
        date: dateTime,
        isFree: Boolean(isFree),
      };

      // Opsiyonel alanları sadece doluysa ekle
      if (description && description.trim()) {
        payload.description = description.trim();
      }
      if (location && location.trim()) {
        payload.location = location.trim();
      }
      if (coverUrl) {
        payload.coverImage = coverUrl;
      }

      // Fiyat bilgisi - ücretsiz etkinliklerde null, ücretli etkinliklerde fiyat
      payload.price = isFree ? null : (price && price > 0 ? Number(price) : null);

      await api.post("/events", payload);

      onCreated();
      onClose();
      setTitle("");
      setDescription("");
      setDate("");
      setTime("");
      setLocation("");
      setCoverImage(null);
      setIsFree(true);
      setPrice(0);
    } catch (err: any) {
      console.error("Etkinlik oluşturulamadı:", err);
      const errorMessage = err?.response?.data?.message || err?.message || "Etkinlik oluşturulamadı. Lütfen tekrar deneyin.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[100] transition-all"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#1a1a1a]/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg p-6 relative border border-gray-200 dark:border-gray-700/40 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-[#ff7b00] transition-colors"
        >
          <X size={22} />
        </button>

        <h2 className="text-2xl font-semibold text-[#ff7b00] mb-4">
          Yeni Etkinlik Oluştur
        </h2>

        {/* Limit Uyarısı */}
        {limitError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{limitError}</p>
          </div>
        )}

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
              Etkinlik Adı *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              placeholder="Etkinlik başlığı..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                Tarih *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                Saat
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Konum
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              placeholder="Etkinlik konumu..."
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
              placeholder="Etkinliğin içeriği hakkında kısa bilgi..."
            ></textarea>
          </div>

          {/* Ücret Bilgisi */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
              Ücret Bilgisi
            </label>
            
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={!isFree}
                onChange={(e) => {
                  setIsFree(!e.target.checked);
                  if (e.target.checked) {
                    // Ücretli etkinlik seçildi, fiyat alanı görünecek
                  } else {
                    // Ücretsiz etkinlik seçildi, fiyatı sıfırla
                    setPrice(0);
                  }
                }}
                className="w-4 h-4 accent-[#ff7b00] cursor-pointer"
                id="isPaidCheckbox"
              />
              <label htmlFor="isPaidCheckbox" className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                Ücretli Etkinlik
              </label>
            </div>

            {!isFree && (
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  Etkinlik Ücreti (₺) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={price || ""}
                  onChange={(e) => {
                    const value = e.target.value === "" ? 0 : Number(e.target.value);
                    setPrice(value >= 0 ? value : 0);
                  }}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
                  placeholder="Ör: 150"
                  required={!isFree}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 1 ₺, maksimum 10.000 ₺
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim() || !date.trim() || (!isFree && (!price || price < 1 || price > 10000))}
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

