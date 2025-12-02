"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Calendar, Loader2 } from "lucide-react";
import api from "@/lib/api";
import RightSidebar from "@/components/right-sidebar";

interface TicketPurchase {
  id: string;
  code: string;
  qrUrl: string;
  used: boolean;
  usedAt?: string;
  createdAt: string;
  ticket: {
    type: string;
    price: number;
    event: {
      id: string;
      title: string;
      date: string;
      coverImage?: string;
    };
  };
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyTickets() {
      try {
        const res = await api.get("/tickets/mine");
        setTickets(res.data);
      } catch (err) {
        console.error("Biletler alınamadı:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMyTickets();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-10 pt-6 px-6 max-w-7xl mx-auto">
      {/* Orta içerik */}
      <div className="flex-1 max-w-[1200px] space-y-10 mx-auto xl:mr-[420px]">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-brand-orange">
            Biletlerim
          </h1>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            <p className="text-gray-500 text-lg">Henüz bilet satın almadınız.</p>
            <p className="text-sm text-gray-400">Etkinlikler sayfasından bilet alabilirsiniz.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="bg-white dark:bg-[#1a1a1a]/70 backdrop-blur-md border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                {/* Event cover image */}
                {t.ticket.event.coverImage && (
                  <div className="relative h-32 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <img
                      src={t.ticket.event.coverImage}
                      alt={t.ticket.event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-5 flex flex-col justify-between min-h-[200px]">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                      {t.ticket.event.title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(t.ticket.event.date).toLocaleDateString("tr-TR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-gray-400 mb-1">
                      Tür: <span className="font-medium">{t.ticket.type}</span>
                    </p>
                    <p className="text-sm text-gray-400 mb-2">
                      Kod: <span className="font-mono text-brand-orange font-semibold">{t.code}</span>
                    </p>
                    <p className="text-sm mb-4">
                      Fiyat: <span className="font-bold text-brand-orange">{t.ticket.price} ₺</span>
                    </p>
                    <p className="text-sm mb-4">
                      Durum:{" "}
                      <span
                        className={`font-medium ${
                          t.used
                            ? "text-red-500"
                            : "text-green-500"
                        }`}
                      >
                        {t.used ? "❌ Kullanıldı" : "✅ Aktif"}
                      </span>
                    </p>
                  </div>

                  {/* QR Code */}
                  {!t.used && t.qrUrl && (
                    <div className="mt-4 flex justify-center border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Giriş için QR kodu gösterin
                        </p>
                        <img
                          src={t.qrUrl}
                          alt="QR Code"
                          className="w-28 h-28 mx-auto rounded-lg border border-gray-300 dark:border-gray-700"
                        />
                      </div>
                    </div>
                  )}

                  {/* PDF Download Button */}
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.get(`/tickets/pdf/${t.code}`, {
                          responseType: 'blob',
                        });
                        
                        // Blob'dan dosya oluştur ve indir
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `${t.ticket.event.title.replace(/[^a-z0-9]/gi, '_')}_Bilet_${t.code}.pdf`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url);
                        
                        toast.success('🎟️ Bilet PDF\'i başarıyla indirildi!');
                      } catch (error: any) {
                        console.error('PDF indirme hatası:', error);
                        toast.error(error.response?.data?.message || 'PDF indirme sırasında bir hata oluştu.');
                      }
                    }}
                    className="text-center mt-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 w-full"
                  >
                    <span>PDF İndir</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sağ sidebar */}
      <RightSidebar />
    </div>
  );
}

