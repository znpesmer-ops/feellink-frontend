"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, Users, MessageCircle, Ticket, Loader2, X, Plus, Edit3, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import RightSidebar from "@/components/right-sidebar";
import CreateTicketModal from "@/components/tickets/CreateTicketModal";
import BuyTicketModal from "@/components/tickets/BuyTicketModal";
import { useAuthStore } from "@/lib/store";

interface EventComment {
  id: string;
  text: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    fullName?: string;
    avatar?: string;
  };
}

interface Event {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  date: string;
  participantCount: number;
  ticketUrl?: string;
  createdAt: string;
  ownerId?: string;
  price?: number;
  isFree?: boolean;
  location?: string;
  owner?: {
    id: string;
    username: string;
    fullName?: string;
    avatar?: string;
  };
}

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<EventComment[]>([]);
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [showBuyTicketModal, setShowBuyTicketModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventRes, commentRes, ticketsRes] = await Promise.all([
          api.get(`/events/${id}`),
          api.get(`/events/${id}/comments`),
          api.get(`/tickets/event/${id}`).catch(() => ({ data: [] })),
        ]);
        setEvent(eventRes.data);
        setComments(commentRes.data);
        setTickets(ticketsRes.data);
      } catch (error) {
        console.error("Etkinlik verisi alınamadı:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await api.post(`/events/${id}/join`);
      setEvent((prev) => prev ? { ...prev, participantCount: prev.participantCount + 1 } : null);
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(false);
    }
  };


  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/events/${id}/comments`, { text: comment });
      setComments((prev) => [res.data, ...prev]);
      setComment("");
    } catch (error) {
      console.error("Yorum eklenemedi:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShowParticipants = async () => {
    try {
      const res = await api.get(`/events/${id}/participants`);
      setParticipants(res.data);
      setShowParticipants(true);
    } catch (error) {
      console.error("Katılımcılar alınamadı:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
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

  return (
    <div className="flex justify-center gap-10 pt-6 px-6 max-w-7xl mx-auto">
      {/* 📰 Orta içerik */}
      <div className="flex-1 max-w-[1200px] space-y-10 mx-auto xl:mr-[420px]">
        <div className="text-gray-900 dark:text-gray-100 transition-all duration-300">
          {/* Kapak Görseli */}
          <div className="w-full h-72 rounded-2xl overflow-hidden shadow-lg mb-8">
            <img
              src={event.coverImage || "/placeholder.png"}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Başlık & Bilgiler */}
          <h1 className="text-3xl font-bold text-brand-orange mb-2">{event.title}</h1>
          <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 mb-6">
            <span className="flex items-center gap-1">
              <Calendar size={16} />
              {new Date(event.date).toLocaleDateString("tr-TR", {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            <button
              onClick={handleShowParticipants}
              className="flex items-center gap-1 hover:text-brand-orange transition-colors"
            >
              <Users size={16} /> {event.participantCount} Katılımcı
            </button>
          </div>

          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            {event.description || "Açıklama bulunmuyor."}
          </p>

          {/* Biletler */}
          {tickets.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">🎟️ Biletler</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-white dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-5"
                  >
                    <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{ticket.type}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Kapasite: {ticket.capacity} | Satılan: {ticket.sold}
                    </p>
                    <p className="text-2xl font-bold text-brand-orange mb-4">{ticket.price} ₺</p>
                    
                    {/* Organizatör için yönetim butonları */}
                    {event.ownerId === user?.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            // TODO: Düzenle modal'ı aç
                            toast.info("Düzenleme özelliği yakında eklenecek");
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium transition"
                        >
                          <Edit3 size={16} /> Düzenle
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`"${ticket.type}" biletini silmek istediğinizden emin misiniz?`)) {
                              try {
                                await api.delete(`/tickets/${ticket.id}`);
                                toast.success("Bilet başarıyla silindi.");
                                // Ticket listesini yenile
                                const ticketsRes = await api.get(`/tickets/event/${id}`).catch(() => ({ data: [] }));
                                setTickets(ticketsRes.data || []);
                              } catch (error: any) {
                                toast.error(error.response?.data?.message || "Bilet silinemedi.");
                              }
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl font-medium transition"
                        >
                          <Trash2 size={16} /> Sil
                        </button>
                      </div>
                    ) : (
                      /* Kullanıcı için kart içinde buton yok, sadece bilgi */
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {ticket.sold >= ticket.capacity ? (
                          <span className="text-red-500 font-medium">Tükendi</span>
                        ) : (
                          <span className="text-green-500 font-medium">Satışta</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bilet Al / Yönetim Butonları */}
          <div className="mt-6 mb-10 flex gap-3">
            {/* Kullanıcı için: Tek Bilet Al butonu */}
            {event.ownerId !== user?.id && (
              <>
                {(() => {
                  // Fiyat hesaplama: önce event.price, sonra tickets'dan en düşük fiyat
                  const ticketPrice = tickets.length > 0 
                    ? Math.min(...tickets.filter(t => t.sold < t.capacity).map(t => t.price))
                    : null;
                  const displayPrice = event.price && event.price > 0 ? event.price : (ticketPrice || 0);
                  const isFree = (event.isFree || displayPrice === 0) && (!tickets.length || ticketPrice === 0);

                  if (isFree) {
                    return (
                      <button
                        onClick={() => setShowBuyTicketModal(true)}
                        className="bg-orange-100 dark:bg-orange-900/30 text-brand-orange dark:text-orange-400 px-6 py-2 rounded-xl font-medium hover:bg-brand-blue/20 dark:hover:bg-brand-blue/30 transition flex items-center gap-2"
                      >
                        <Ticket size={18} /> Ücretsiz Bilet Al
                      </button>
                    );
                  } else {
                    return (
                      <button
                        onClick={() => setShowBuyTicketModal(true)}
                        className="bg-brand-orange hover:bg-brand-orange/90 text-white px-6 py-2 rounded-xl font-medium transition flex items-center gap-2"
                      >
                        <Ticket size={18} /> Bilet Al – {displayPrice}₺
                      </button>
                    );
                  }
                })()}
              </>
            )}

            {/* Organizatör için: Bilet Ekle butonu */}
            {event.ownerId === user?.id && (
              <button
                onClick={() => setShowTicketModal(true)}
                className="bg-brand-orange hover:bg-brand-orange/90 text-white px-4 py-2 rounded-xl font-medium transition flex items-center gap-2"
              >
                <Plus size={18} /> Bilet Ekle
              </button>
            )}
          </div>

          {/* Yorumlar */}
          <div className="mt-10 border-t border-gray-200 dark:border-gray-800 pt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageCircle size={18} /> Yorumlar
            </h2>

            <form onSubmit={handleComment} className="flex gap-2 mb-6">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-brand-orange dark:bg-gray-800 dark:text-white transition"
                placeholder="Yorum yaz..."
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={submitting || !comment.trim()}
                className="bg-brand-orange hover:bg-brand-orange/90 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl transition font-medium"
              >
                {submitting ? "Gönderiliyor..." : "Gönder"}
              </button>
            </form>

            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Henüz yorum yapılmamış.
                </p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-[#1a1a1a]/70 backdrop-blur-md border border-gray-200 dark:border-gray-700/40 p-3 rounded-xl"
                  >
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold text-brand-orange">@{c.author.username}</span>:{" "}
                      {c.text}
                    </p>
                    <span className="text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleString("tr-TR")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🟠 Sağ sabit sidebar */}
      <RightSidebar />

      {/* Katılımcı Listesi Modal */}
      {showParticipants && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white dark:bg-[#1a1a1a]/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md p-6 relative border border-gray-200 dark:border-gray-700/40">
            <button
              onClick={() => setShowParticipants(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-brand-orange transition-colors"
            >
              <X size={22} />
            </button>

            <h2 className="text-xl font-semibold text-brand-orange mb-4">
              Katılımcı Listesi
            </h2>

            {participants.length === 0 ? (
              <p className="text-gray-500 text-sm">Henüz katılım yok.</p>
            ) : (
              <ul className="space-y-3 max-h-80 overflow-y-auto">
                {participants.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => router.push(`/profile/${p.username}`)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition"
                  >
                    <img
                      src={p.avatar || "/placeholder.png"}
                      alt={p.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        @{p.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.fullName || "Katılımcı"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Bilet Ekle Modal */}
      {event && (
        <CreateTicketModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          eventId={event.id}
        />
      )}

      {/* Bilet Satın Alma Modal */}
      {event && (
        <BuyTicketModal
          event={event}
          isOpen={showBuyTicketModal}
          onClose={() => setShowBuyTicketModal(false)}
        />
      )}
    </div>
  );
}

