"use client";
import { useState, useEffect } from "react";
import { Plus, Calendar, Edit3, Eye, Trash2, Users, Loader2, Ticket } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import CreateEventModal from "@/components/events/CreateEventModal";
import CreateTicketModal from "@/components/tickets/CreateTicketModal";
import RightSidebar from "@/components/right-sidebar";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Wait for hydration before redirecting
    if (!user) return;
    
    // Check if user is corporate
    if (user.role !== 'CORPORATE') {
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
  }, [user, router]);

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

  const handleRefresh = async () => {
    try {
      const res = await api.get("/events/my");
      setEvents(res.data);
    } catch (error) {
      console.error("Etkinlikler alınamadı:", error);
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
    <div className="flex justify-center gap-10 pt-6 px-6 max-w-7xl mx-auto">
      {/* 📰 Orta içerik */}
      <div className="flex-1 max-w-[1200px] space-y-10 mx-auto xl:mr-[420px]">
        <div className="text-gray-900 dark:text-gray-100 transition-all duration-300">
          {/* Üst başlık */}
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-bold text-[#ff7b00] mb-1">
                🎟️ Etkinliklerim
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Kurumunuza ait etkinlikleri yönetin, düzenleyin ve paylaşın.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#ff7b00] hover:bg-[#e36f00] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition"
              >
                <Plus size={18} /> Yeni Etkinlik
              </button>
              <button
                onClick={() => setIsTicketModalOpen(true)}
                className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition"
                disabled={events.length === 0}
              >
                <Ticket size={18} /> Bilet Oluştur
              </button>
            </div>
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

          {/* Yeni Etkinlik Modal */}
          <CreateEventModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onCreated={handleRefresh}
          />

          {/* Bilet Oluştur - İlk Etkinlik Seçimi */}
          {isTicketModalOpen && !selectedEventId && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
              <div className="bg-white dark:bg-[#1a1a1a]/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md p-6 relative border border-gray-200 dark:border-gray-700/40">
                <h2 className="text-2xl font-semibold text-[#ff7b00] mb-4">
                  🎟️ Etkinlik Seçin
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Bilet oluşturmak için bir etkinlik seçin
                </p>
                <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                  {events.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-[#ff7b00]/10 hover:border-[#ff7b00] transition"
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">{ev.title}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(ev.date).toLocaleDateString("tr-TR")}
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setIsTicketModalOpen(false);
                    setSelectedEventId("");
                  }}
                  className="mt-4 w-full py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          {/* Bilet Oluştur Modal */}
          {selectedEventId && (
            <CreateTicketModal
              isOpen={isTicketModalOpen}
              onClose={() => {
                setIsTicketModalOpen(false);
                setSelectedEventId("");
              }}
              eventId={selectedEventId}
              onCreated={() => {
                setSelectedEventId("");
              }}
            />
          )}
        </div>
      </div>

      {/* 🟠 Sağ sabit sidebar */}
      <RightSidebar />
    </div>
  );
}

