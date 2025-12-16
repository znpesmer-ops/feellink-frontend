"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, Ticket, Calendar, MapPin, AlertCircle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import RightSidebar from "@/components/right-sidebar";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

interface Event {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  date: string;
  location?: string;
  price?: number;
  isFree?: boolean;
  owner?: {
    id: string;
    username: string;
    fullName?: string;
    avatar?: string;
  };
}

export default function BuyTicketPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventRes, ticketsRes] = await Promise.all([
          api.get(`/events/${id}`),
          api.get(`/tickets/event/${id}`).catch(() => ({ data: [] })),
        ]);
        setEvent(eventRes.data);
        setTickets(ticketsRes.data || []);
      } catch (error: any) {
        console.error("Etkinlik verisi alınamadı:", error);
        toast.error("Etkinlik bulunamadı.");
        router.push("/events");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, router]);

  const handlePurchase = async () => {
    if (!event || !user) {
      toast.error("Giriş yapmanız gerekiyor.");
      router.push("/login");
      return;
    }

    // Eğer event ücretsizse, direkt katıl
    if (event.isFree || !event.price || event.price === 0) {
      try {
        await api.post(`/events/${id}/join`);
        toast.success("✅ Etkinliğe başarıyla katıldınız!");
        router.push(`/events/${id}`);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Etkinliğe katılamadınız.");
      }
      return;
    }

    // Ücretli etkinlik için bilet satın alma
    setPurchasing(true);
    try {
      // Önce event için ticket var mı kontrol et
      let ticketToPurchase = tickets.find((t) => t.price === event.price);

      // Eğer ticket yoksa, event sahibi ticket oluşturmalı
      if (!ticketToPurchase) {
        toast.error("Bu etkinlik için henüz bilet oluşturulmamış. Lütfen etkinlik sahibiyle iletişime geçin.");
        setPurchasing(false);
        return;
      }

      // Ticket satın al
      const res = await api.post("/tickets/purchase", { ticketId: ticketToPurchase.id });
      
      toast.success("🎟️ Bilet başarıyla satın alındı! Biletlerim sayfasından görüntüleyebilirsiniz.");
      
      // Biletlerim sayfasına yönlendir
      setTimeout(() => {
        router.push("/my-tickets");
      }, 1500);
    } catch (error: any) {
      console.error("Bilet satın alma hatası:", error);
      toast.error(error.response?.data?.message || "Bilet satın alınamadı. Lütfen tekrar deneyin.");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff7b00]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Etkinlik bulunamadı.</p>
      </div>
    );
  }

  const isFree = event.isFree || !event.price || event.price === 0;
  const hasTicket = tickets.length > 0 && tickets.some((t) => t.price === event.price);

  return (
    <div className="flex justify-center gap-10 pt-6 px-6 max-w-7xl mx-auto">
      {/* Orta içerik */}
      <div className="flex-1 max-w-[1200px] space-y-10 mx-auto xl:mr-[420px]">
        <div className="bg-white dark:bg-[#1a1a1a]/70 backdrop-blur-md border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-lg overflow-hidden">
          {/* Kapak Görseli */}
          {event.coverImage && (
            <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <img
                src={resolveImageUrl(event.coverImage)}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8">
            {/* Başlık */}
            <h1 className="text-3xl font-bold text-[#ff7b00] mb-4">{event.title}</h1>

            {/* Etkinlik Bilgileri */}
            <div className="space-y-3 mb-6">
              {event.date && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar size={18} />
                  <span>
                    {new Date(event.date).toLocaleDateString("tr-TR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}

              {event.location && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin size={18} />
                  <span>{event.location}</span>
                </div>
              )}

              {event.description && (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                  {event.description}
                </p>
              )}
            </div>

            {/* Fiyat Bilgisi */}
            <div className="bg-gradient-to-r from-[#ff7b00]/10 to-[#ff7b00]/5 dark:from-[#ff7b00]/20 dark:to-[#ff7b00]/10 rounded-xl p-6 mb-6 border border-[#ff7b00]/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Etkinlik Ücreti</p>
                  <p className="text-3xl font-bold text-[#ff7b00]">
                    {isFree ? "Ücretsiz" : `${event.price} ₺`}
                  </p>
                </div>
                <div className="p-4 bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20 rounded-xl">
                  <Ticket size={32} className="text-[#ff7b00]" />
                </div>
              </div>
            </div>

            {/* Uyarı Mesajı */}
            {!isFree && !hasTicket && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Bilet Henüz Oluşturulmamış
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    Bu etkinlik için henüz bilet oluşturulmamış. Lütfen etkinlik sahibiyle iletişime geçin.
                  </p>
                </div>
              </div>
            )}

            {/* Satın Alma Butonu */}
            <div className="flex gap-3">
              {isFree ? (
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="flex-1 bg-[#ff7b00] hover:bg-[#e36f00] disabled:bg-gray-300 text-white px-6 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
                >
                  {purchasing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Katılıyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Etkinliğe Katıl
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={purchasing || !hasTicket}
                  className="flex-1 bg-[#ff7b00] hover:bg-[#e36f00] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
                >
                  {purchasing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Satın Alınıyor...
                    </>
                  ) : (
                    <>
                      <Ticket size={20} />
                      Bilet Al – {event.price} ₺
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => router.push(`/events/${id}`)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Geri Dön
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sağ sidebar */}
      <RightSidebar />
    </div>
  );
}


















