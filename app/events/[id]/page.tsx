"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, Users, MessageCircle, Ticket, Loader2, X, Plus, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import RightSidebar from "@/components/right-sidebar";
import CreateTicketModal from "@/components/tickets/CreateTicketModal";
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
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [purchasing, setPurchasing] = useState(false);

  // ESC tuşu ile modal kapatma
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPurchaseModal) {
        setShowPurchaseModal(false);
        setSelectedTicket(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showPurchaseModal]);

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

  const handleBuyTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = async () => {
    if (!selectedTicket) return;
    
    setPurchasing(true);
    try {
      const res = await api.post("/tickets/purchase", { ticketId: selectedTicket.id });
      toast.success("🎟️ Bilet başarıyla satın alındı! E-postanızı kontrol edin.");
      setShowPurchaseModal(false);
      setSelectedTicket(null);
      // QR kodu göster veya başka bir işlem yap
      console.log("Purchase result:", res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Bilet satın alınamadı. Lütfen tekrar deneyin.");
    } finally {
      setPurchasing(false);
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
          <h1 className="text-3xl font-bold text-[#ff7b00] mb-2">{event.title}</h1>
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
              className="flex items-center gap-1 hover:text-[#ff7b00] transition-colors"
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
                    <p className="text-2xl font-bold text-[#ff7b00] mb-4">{ticket.price} ₺</p>
                    <button
                      onClick={() => handleBuyTicket(ticket)}
                      disabled={ticket.sold >= ticket.capacity}
                      className="w-full bg-[#ff7b00] hover:bg-[#e36f00] disabled:bg-gray-300 text-white px-4 py-2 rounded-xl font-medium transition"
                    >
                      {ticket.sold >= ticket.capacity ? "Tükendi" : "Satın Al"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Katıl Butonu */}
          <div className="mt-6 mb-10 flex gap-3">
            <button
              onClick={handleJoin}
              disabled={joining}
              className="bg-orange-100 dark:bg-orange-900/30 text-[#ff7b00] dark:text-orange-400 px-4 py-2 rounded-xl font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition"
            >
              {joining ? "Katılıyor..." : "Etkinliğe Katıl"}
            </button>

            {/* Bilet Ekle Butonu (Sadece etkinlik sahibi görür) */}
            {event.ownerId === user?.id && (
              <button
                onClick={() => setShowTicketModal(true)}
                className="bg-[#ff7b00] hover:bg-[#e36f00] text-white px-4 py-2 rounded-xl font-medium transition flex items-center gap-2"
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
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
                placeholder="Yorum yaz..."
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={submitting || !comment.trim()}
                className="bg-[#ff7b00] hover:bg-[#e36f00] disabled:bg-gray-300 text-white px-4 py-2 rounded-xl transition font-medium"
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
                      <span className="font-semibold text-[#ff7b00]">@{c.author.username}</span>:{" "}
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
              className="absolute top-3 right-3 text-gray-400 hover:text-[#ff7b00] transition-colors"
            >
              <X size={22} />
            </button>

            <h2 className="text-xl font-semibold text-[#ff7b00] mb-4">
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

      {/* Bilet Satın Alma Onay Modal */}
      {showPurchaseModal && selectedTicket && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPurchaseModal(false);
              setSelectedTicket(null);
            }
          }}
        >
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700/40 overflow-hidden transform transition-all duration-200 scale-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#ff7b00]/10 to-[#ff7b00]/5 dark:from-[#ff7b00]/20 dark:to-[#ff7b00]/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-[#ff7b00]" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Bilet Satın Al
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Bu bileti satın almak istediğinizden emin misiniz?
              </p>

              {/* Ticket Info */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {selectedTicket.type}
                  </span>
                  <span className="text-2xl font-bold text-[#ff7b00]">
                    {selectedTicket.price} ₺
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                  <span>Kapasite: {selectedTicket.capacity}</span>
                  <span>Satılan: {selectedTicket.sold}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-700/40 flex gap-3">
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setSelectedTicket(null);
                }}
                disabled={purchasing}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={confirmPurchase}
                disabled={purchasing}
                className="flex-1 px-4 py-2.5 bg-[#ff7b00] hover:bg-[#e36f00] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition font-medium flex items-center justify-center gap-2"
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <Ticket className="w-4 h-4" />
                    Satın Al
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

