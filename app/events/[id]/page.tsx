"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Users, MessageCircle, Ticket, Loader2, X, Plus, Edit3, Trash2, MoreVertical } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import RightSidebar from "@/components/right-sidebar";
import CreateTicketModal from "@/components/tickets/CreateTicketModal";
import BuyTicketModal from "@/components/tickets/BuyTicketModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import ApproveParticipantModal from "@/components/events/ApproveParticipantModal";
import { useAuthStore } from "@/lib/store";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

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
  participants?: {
    userId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
  }[];
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  // ✅ Onay modal state
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<{ userId: string; username: string } | null>(null);
  const [isApproving, setIsApproving] = useState(false);

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

  // Etkinlik sahibi için PENDING talepleri çek
  useEffect(() => {
    async function fetchPendingRequests() {
      if (!event || !user || event.ownerId !== user.id) {
        return;
      }

      setLoadingRequests(true);
      try {
        const res = await api.get(`/events/${id}/requests`);
        setPendingRequests(res.data || []);
      } catch (error) {
        console.error("Talep listesi alınamadı:", error);
      } finally {
        setLoadingRequests(false);
      }
    }

    if (event && user) {
      fetchPendingRequests();
    }
  }, [id, event, user]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await api.post(`/events/${id}/join`);
      toast.success("Talebiniz iletildi. Etkinlik sahibinin onayı bekleniyor.");
      // Don't increment count yet - it will increment when approved
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.response?.data?.message || err?.message || "Talep oluşturulamadı.";
      if (err?.response?.status === 403 && errorMessage.includes("Already joined")) {
        toast.error("Bu etkinlik için zaten bir talebiniz var.");
      } else {
        toast.error(errorMessage);
      }
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

  const handleDeleteEvent = async () => {
    if (!event) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/events/${id}`);
      toast.success("Etkinlik başarıyla silindi.");
      router.push("/events");
    } catch (error: any) {
      console.error("Etkinlik silinemedi:", error);
      toast.error(error.response?.data?.message || "Etkinlik silinemedi.");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleUpdateRequestStatus = async (requestUserId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/events/${id}/requests/${requestUserId}`, { status });
      
      if (status === 'APPROVED') {
        toast.success("Talep onaylandı.");
        // Update participant count
        if (event) {
          setEvent({ ...event, participantCount: event.participantCount + 1 });
        }
      } else {
        toast.success("Talep reddedildi.");
      }

      // Remove from pending requests
      setPendingRequests(prev => prev.filter(r => r.userId !== requestUserId));
    } catch (error: any) {
      console.error("Talep durumu güncellenemedi:", error);
      toast.error(error.response?.data?.message || "Talep durumu güncellenemedi.");
      throw error; // Modal için hata fırlat
    }
  };

  // ✅ Onay butonuna tıklanınca modal aç
  const handleApproveClick = (request: { userId: string; user: { username: string } }) => {
    setSelectedParticipant({ userId: request.userId, username: request.user.username });
    setApproveModalOpen(true);
  };

  // ✅ Modal içinden onaylama
  const handleConfirmApprove = async () => {
    if (!selectedParticipant) return;

    setIsApproving(true);
    try {
      await handleUpdateRequestStatus(selectedParticipant.userId, 'APPROVED');
      setApproveModalOpen(false);
      setSelectedParticipant(null);
      toast.success("Katılımcı etkinliğe başarıyla onaylandı.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsApproving(false);
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

  // Kullanıcının bu etkinlikteki durumu
  const userParticipant = event.participants?.find(p => p.userId === user?.id);
  const isApproved = userParticipant?.status === 'APPROVED';
  const hasRequest = userParticipant !== undefined;

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

          {/* Başlık & Etkinlik Sahibi */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <h1 className="text-3xl font-bold text-brand-orange">{event.title}</h1>
            <div className="flex items-center gap-3">
              {/* Etkinlik Sahibi - Başlığın sağında */}
              {event.owner && (
                <Link
                  href={`/profile/${event.owner.username}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  {event.owner.avatar ? (
                    <img
                      src={resolveImageUrl(event.owner.avatar)}
                      alt={event.owner.username}
                      className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png';
                      }}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-brand-orange/20 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-semibold text-brand-orange">
                        {(event.owner.fullName || event.owner.username)?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {event.owner.fullName || event.owner.username}
                  </span>
                </Link>
              )}
              {/* Üç nokta menüsü - sadece etkinlik sahibi için */}
              {user?.id === event.ownerId && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <MoreVertical size={20} className="text-gray-500 dark:text-gray-400" />
                  </button>
                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 top-10 z-20 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            setShowDeleteModal(true);
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={16} /> Etkinliği Sil
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 mb-6 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar size={16} />
              {new Date(event.date).toLocaleDateString("tr-TR", {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            {event.date && (
              <span className="flex items-center gap-1">
                🕒 {new Date(event.date).toLocaleTimeString("tr-TR", {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </span>
            )}
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

          {/* Biletler - Sadece APPROVED kullanıcılar için */}
          {tickets.length > 0 && isApproved && (
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
                              toast("Düzenleme özelliği yakında eklenecek");
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

          {/* Katılım Talepleri - Sadece etkinlik sahibi için */}
          {event.ownerId === user?.id && pendingRequests.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Katılım Talepleri ({pendingRequests.length})
              </h3>
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {request.user.avatar ? (
                        <img
                          src={resolveImageUrl(request.user.avatar)}
                          alt={request.user.username}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-brand-orange/20 dark:bg-brand-orange/30 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                          <span className="text-sm font-semibold text-brand-orange">
                            {(request.user.fullName || request.user.username)?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <Link
                          href={`/profile/${request.user.username}`}
                          className="font-semibold text-gray-900 dark:text-gray-100 hover:text-brand-orange transition-colors"
                        >
                          {request.user.fullName || request.user.username}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          @{request.user.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveClick(request)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition"
                      >
                        Onayla
                      </button>
                      <button
                        onClick={() => handleUpdateRequestStatus(request.userId, 'REJECTED')}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
                      >
                        Reddet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Talep Oluştur / Yönetim Butonları */}
          <div className="mt-6 mb-10">
            {/* Kullanıcı için: Talep Oluştur butonu - Sadece APPROVED değilse göster */}
            {event.ownerId !== user?.id && !isApproved && (
                <div className="flex flex-col">
                  <button
                    onClick={handleJoin}
                    disabled={joining || hasRequest}
                    className="bg-brand-orange hover:bg-brand-orange/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-medium transition flex items-center gap-2 w-fit"
                  >
                    {joining ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Gönderiliyor...
                      </>
                    ) : hasRequest ? (
                      <>
                        <Ticket size={18} /> Talep Beklemede
                      </>
                    ) : (
                      <>
                        <Ticket size={18} /> Talep Oluştur
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Etkinlik sahibi talebinizi onayladığında size mail iletilecektir.
                  </p>
                </div>
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

      {/* ✅ Onay Modal */}
      {event && selectedParticipant && (
        <ApproveParticipantModal
          open={approveModalOpen}
          participantName={selectedParticipant.username}
          eventTitle={event.title}
          onConfirm={handleConfirmApprove}
          onCancel={() => {
            setApproveModalOpen(false);
            setSelectedParticipant(null);
          }}
          isLoading={isApproving}
        />
      )}

      {/* Silme Onay Modal */}
      <DeleteConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteEvent}
        title="Etkinliği silmek istiyor musunuz?"
        message="Bu işlem geri alınamaz. Etkinliğe ait talepler ve biletler iptal edilecektir."
        confirmText="Etkinliği Sil"
        cancelText="Vazgeç"
      />
    </div>
  );
}

