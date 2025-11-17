"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Calendar, Edit3, Eye, Trash2, Users, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
// Bilet oluşturma özelliği kaldırıldı - sadece etkinlik yönetimi
// RightSidebar artık sadece ana sayfada görünüyor

interface Event {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  date: string;
  participantCount: number;
  createdAt: string;
}

export default function MyEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, capabilities } = useAuthStore();
  const router = useRouter();
  const canManageEvents = Boolean(capabilities?.permissions.canAccessMyEvents);

  useEffect(() => {
    if (!user || !capabilities) return;

    if (!canManageEvents) {
      router.push('/feed');
      return;
    }

    async function fetchEvents() {
      try {
        const res = await api.get("/events/my");
        setEvents(res.data);
      } catch (error) {
        console.error("Etkinlikler alınamadı:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [user, capabilities, canManageEvents, router]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu etkinliği silmek istediğinizden emin misiniz?")) {
      return;
    }

    try {
      await api.delete(`/events/${id}`);
      setEvents(events.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Silme hatası:", error);
      alert("Etkinlik silinemedi.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff7b00]" />
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-4">
      {/* 🔥 KRİTİK: Geniş container - tam ekran genişliği */}
      <div className="max-w-[1600px] mx-auto text-gray-900 dark:text-gray-100 transition-all duration-300">
        {/* Üst başlık */}
        {/* 🔥 KRİTİK: Profesyonel header layout - başlık ve buton aynı satırda */}
        <div className="mb-6">
          {/* Başlık ve buton aynı satırda */}
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-[#ff7b00]">
              Etkinliklerim
            </h1>
            <Link
              href="/corporate/events/new"
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition shadow-md whitespace-nowrap"
            >
              + Etkinlik Oluştur
            </Link>
          </div>
          {/* Açıklama metni altında */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Kurumunuza ait etkinlikleri yönetin, düzenleyin ve paylaşın.
          </p>
        </div>

        {/* İçerik */}
        {events.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            <p className="text-gray-500 text-lg">Henüz etkinlik eklenmemiş.</p>
            <p className="text-sm text-gray-400">Yeni bir etkinlik oluşturun.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white dark:bg-[#1a1a1a]/70 backdrop-blur-md border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  <div className="relative h-48 bg-gray-100 dark:bg-gray-800">
                    <img
                      src={ev.coverImage || "/placeholder.png"}
                      alt={ev.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
                      {ev.title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                      {ev.description || "Açıklama eklenmemiş."}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      <Calendar size={14} />
                      {new Date(ev.date).toLocaleDateString("tr-TR", {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Users size={14} /> {ev.participantCount || 0} Katılımcı
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => router.push(`/events/${ev.id}`)}
                          className="flex items-center gap-1 text-gray-500 hover:text-[#ff7b00] transition-colors"
                        >
                          <Eye size={16} /> Gör
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-[#ff7b00] transition-colors">
                          <Edit3 size={16} /> Düzenle
                        </button>
                        <button 
                          onClick={() => handleDelete(ev.id)}
                          className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} /> Sil
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

