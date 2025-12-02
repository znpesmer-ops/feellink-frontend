"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Loader2, Ticket, Calendar, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { useQueryClient } from "@tanstack/react-query";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

interface BuyTicketModalProps {
  event: {
    id: string;
    title: string;
    date: string;
    coverImage?: string;
    price?: number;
    isFree?: boolean;
    location?: string;
    description?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function BuyTicketModal({ event, isOpen, onClose }: BuyTicketModalProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const unitPrice = event.price ?? 0;
  const isFree = event.isFree || unitPrice === 0;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // User bilgilerini otomatik doldur
  useEffect(() => {
    if (user) {
      if (user.fullName) setFullName(user.fullName);
      if (user.email) setEmail(user.email);
    }
  }, [user]);

  // Event tickets'ları yükle
  useEffect(() => {
    if (isOpen && event.id) {
      async function fetchTickets() {
        try {
          const res = await api.get(`/tickets/event/${event.id}`).catch(() => ({ data: [] }));
          setTickets(res.data || []);
        } catch (error) {
          console.error("Tickets yüklenemedi:", error);
          setTickets([]);
        } finally {
          setLoadingTickets(false);
        }
      }
      fetchTickets();
    }
  }, [isOpen, event.id]);

  const totalPrice = useMemo(() => unitPrice * quantity, [unitPrice, quantity]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Giriş yapmanız gerekiyor.");
      router.push("/login");
      return;
    }

    if (!acceptedTerms) {
      setError("Bilet satın almadan önce şartları kabul etmelisiniz.");
      return;
    }

    if (!fullName.trim() || !email.trim()) {
      setError("Ad Soyad ve E-posta alanları zorunludur.");
      return;
    }

    // Ücretsiz etkinlik için direkt katıl
    if (isFree) {
      setLoading(true);
      try {
        await api.post(`/events/${event.id}/join`);
        toast.success("✅ Etkinliğe başarıyla katıldınız!");
        queryClient.invalidateQueries({ queryKey: ["events", event.id] });
        onClose();
        router.push(`/events/${event.id}`);
      } catch (error: any) {
        setError(error.response?.data?.message || "Etkinliğe katılamadınız. Lütfen tekrar deneyin.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Ücretli etkinlik için bilet satın alma
    if (!tickets.length || tickets.length === 0) {
      setError("Bu etkinlik için henüz bilet oluşturulmamış. Lütfen etkinlik sahibiyle iletişime geçin.");
      return;
    }

    // Event price'ına uygun ticket bul
    const matchingTicket = tickets.find((t) => t.price === unitPrice) || tickets[0];

    setLoading(true);
    setError(null);

    try {
      // Her bilet için ayrı purchase yap
      for (let i = 0; i < quantity; i++) {
        await api.post("/tickets/purchase", {
          ticketId: matchingTicket.id,
        });
      }

      toast.success(`🎟️ ${quantity} bilet başarıyla satın alındı!`);
      
      // Query'leri invalidate et
      queryClient.invalidateQueries({ queryKey: ["myTickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets", event.id] });
      
      onClose();
      
      // Biletlerim sayfasına yönlendir
      setTimeout(() => {
        router.push("/my-tickets");
      }, 1000);
    } catch (error: any) {
      console.error("Ticket purchase error:", error);
      setError(error.response?.data?.message || "Bilet satın alma sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg mx-4 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 shadow-2xl text-gray-900 dark:text-white max-h-[90vh] overflow-y-auto">
        {/* Başlık */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Bilet Satın Al
            </p>
            <h2 className="text-lg font-semibold text-[#ff7b00]">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none transition disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* İçerik */}
        <div className="px-6 py-4 space-y-4">
          {/* Etkinlik bilgileri */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 flex items-start gap-3">
            {event.coverImage && (
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                <img
                  src={resolveImageUrl(event.coverImage)}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 text-sm">
              <p className="font-medium mb-1">{event.title}</p>
              {event.date && (
                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(event.date).toLocaleDateString("tr-TR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {event.location && (
                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 flex items-center gap-1">
                  <MapPin size={12} />
                  {event.location}
                </p>
              )}
              <p className="text-xs mt-1">
                {unitPrice > 0 ? (
                  <>
                    <span className="font-semibold text-[#ff7b00]">{unitPrice}₺</span> / bilet
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-green-500">Ücretsiz</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Katılımcı bilgileri */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-gray-400">Ad Soyad *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7b00] transition"
                placeholder="Örn: Zeynep Esmer"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-gray-400">E-posta *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7b00] transition"
                placeholder="ornek@mail.com"
                disabled={loading}
              />
            </div>
          </div>

          {/* Adet + Not */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-gray-400">Bilet Adedi *</label>
              <input
                type="number"
                min={1}
                max={10}
                value={quantity}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(10, Number(e.target.value)));
                  setQuantity(isNaN(val) ? 1 : val);
                }}
                className="w-full rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7b00] transition"
                disabled={loading || isFree}
              />
              {isFree && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ücretsiz etkinlikler için tek kişilik kayıt yapılır.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-gray-400">Not (opsiyonel)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7b00] transition"
                placeholder="Örn: Yanımda 1 misafir olacak."
                disabled={loading}
              />
            </div>
          </div>

          {/* Toplam tutar */}
          {!isFree && (
            <div className="flex items-center justify-between rounded-xl bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20 px-4 py-3 border border-[#ff7b00]/20">
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Toplam Tutar
              </span>
              <span className="text-xl font-bold text-[#ff7b00]">
                {totalPrice}₺
              </span>
            </div>
          )}

          {/* KVKK / şartlar */}
          <label className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-[#ff7b00] focus:ring-[#ff7b00] disabled:opacity-50"
              disabled={loading}
            />
            <span>
              <strong>KVKK ve kullanım şartlarını</strong> okudum, kabul ediyorum.
              Etkinlik iletişimleri için e-posta adresimle bana ulaşılmasına izin veriyorum.
            </span>
          </label>

          {/* Hata mesajı */}
          {error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Ticket yoksa uyarı */}
          {loadingTickets ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-[#ff7b00]" />
            </div>
          ) : !isFree && tickets.length === 0 ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300">
              ⚠️ Bu etkinlik için henüz bilet oluşturulmamış. Lütfen etkinlik sahibiyle iletişime geçin.
            </div>
          ) : null}
        </div>

        {/* Alt butonlar */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (!isFree && tickets.length === 0)}
            className="px-5 py-2 text-sm rounded-xl bg-[#ff7b00] text-white font-semibold hover:bg-[#e36f00] disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isFree ? "Katılıyor..." : "Biletiniz oluşturuluyor..."}
              </>
            ) : isFree ? (
              <>
                <Ticket size={16} />
                Etkinliğe Katıl
              </>
            ) : (
              <>
                <Ticket size={16} />
                Biletimi Onayla
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}



