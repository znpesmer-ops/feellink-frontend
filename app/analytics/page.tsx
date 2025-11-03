"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Eye, MessageCircle, Users, Loader2, TrendingUp, Ticket, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import RightSidebar from "@/components/right-sidebar";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";
import { initSocket, getSocket } from "@/lib/socket";
import dynamic from "next/dynamic";

// Dynamic import for TicketChart (SSR disabled for Chart.js)
const TicketChart = dynamic(() => import("@/components/analytics/TicketChart"), {
  ssr: false,
});

// Dynamic import for TopEventsChart
const TopEventsChart = dynamic(() => import("@/components/analytics/TopEventsChart"), {
  ssr: false,
});

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface VisitData {
  date: string;
  count: number;
}

interface WordData {
  word: string;
  count: number;
}

interface TopUser {
  username: string;
  avatar?: string;
  fullName?: string;
  activityCount: number;
}

interface EventStat {
  id: string;
  title: string;
  ticketCount: number;
  totalCapacity: number;
  commentCount: number;
  recentTickets: Array<{
    username: string;
    fullName?: string;
    avatar?: string;
    createdAt: string;
  }>;
}

export default function AnalyticsPage() {
  const { user, accessToken } = useAuthStore();
  const [visits, setVisits] = useState<VisitData[]>([]);
  const [words, setWords] = useState<WordData[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [eventStats, setEventStats] = useState<EventStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [openEvent, setOpenEvent] = useState<string | null>(null);

  // Helper function to check if user is corporate (case-insensitive)
  const isCorporateUser = user?.role?.toUpperCase() === 'CORPORATE';

  // Wait for Zustand hydration to complete
  useEffect(() => {
    // Zustand persist middleware'inin hydration'ını bekle
    // İlk render'da user ve accessToken localStorage'dan yüklenene kadar bekle
    
    // Hemen kontrol et - eğer zaten yüklendiyse direkt geç
    const store = useAuthStore.getState();
    if (store.user !== null || store.accessToken !== null) {
      // En az biri yüklendiyse hydration başlamış demektir
      setIsHydrated(true);
      return;
    }

    // Store değişikliklerini dinle - hydration tamamlandığında user/accessToken set edilecek
    const unsubscribe = useAuthStore.subscribe((state) => {
      // Eğer user veya accessToken yüklendiyse hydration tamamlanmıştır
      if (state.user !== null || state.accessToken !== null) {
        setIsHydrated(true);
      }
    });

    // Fallback: Eğer 1 saniye içinde hydration tamamlanmazsa yine de devam et
    const timeout = setTimeout(() => {
      setIsHydrated(true);
    }, 1000);

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Debug: Log user role
  useEffect(() => {
    if (isHydrated && user) {
      console.log('🔍 Analytics Page - User Role:', user.role, 'Is Corporate:', isCorporateUser, 'AccessToken:', !!accessToken);
    }
  }, [user, isCorporateUser, isHydrated, accessToken]);

  useEffect(() => {
    if (!isHydrated || !user || !isCorporateUser) {
      return;
    }

    async function fetchAnalytics() {
      try {
        setLoading(true);
        const [visitsRes, wordsRes, usersRes, eventsRes] = await Promise.all([
          api.get("/analytics/visits"),
          api.get("/analytics/words"),
          api.get("/analytics/top-users"),
          api.get("/analytics/event-stats"),
        ]);

        setVisits(visitsRes.data);
        setWords(wordsRes.data);
        // 🚫 Yedek güvenlik katmanı: Kendini listeye dahil etme
        const filteredUsers = (usersRes.data || []).filter(
          (u: TopUser) => u.username !== user?.username
        );
        setTopUsers(filteredUsers);
        setEventStats(eventsRes.data);
      } catch (err: any) {
        console.error("Analiz verileri alınamadı:", err);
        toast.error(err.response?.data?.message || "Analiz verileri yüklenemedi");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [user, isHydrated]);

  // 🎟️ Gerçek zamanlı bilet güncellemeleri için socket bağlantısı
  useEffect(() => {
    if (!user || !accessToken || eventStats.length === 0) {
      return;
    }

    const socket = initSocket(accessToken);

    // Her etkinlik için listener ekle
    const listeners: Array<() => void> = [];
    
    eventStats.forEach((event) => {
      const handler = (ticketData: any) => {
        setEventStats((prev) =>
          prev.map((e) => {
            if (e.id === ticketData.eventId) {
              // Yeni bilet listesinin başına ekle ve son 5'i tut
              const updatedRecentTickets = [
                {
                  username: ticketData.username,
                  fullName: ticketData.fullName,
                  avatar: ticketData.avatar,
                  createdAt: ticketData.createdAt,
                },
                ...e.recentTickets,
              ].slice(0, 5);

              return {
                ...e,
                ticketCount: ticketData.ticketCount || e.ticketCount + 1,
                recentTickets: updatedRecentTickets,
              };
            }
            return e;
          })
        );
      };

      socket.on(`ticket_update:${event.id}`, handler);
      listeners.push(() => socket.off(`ticket_update:${event.id}`, handler));
    });

    return () => {
      listeners.forEach((cleanup) => cleanup());
    };
  }, [user, eventStats]);

  // 🏆 Gerçek zamanlı ziyaretçi güncellemeleri için socket bağlantısı
  useEffect(() => {
    if (!user || !accessToken || !user.id) {
      return;
    }

    const socket = initSocket(accessToken);

    // Ziyaretçi güncelleme event'ini dinle
    const handler = (visitorsData: TopUser[]) => {
      // 🚫 Yedek güvenlik katmanı: Kendini listeye dahil etme
      const filteredVisitors = (visitorsData || []).filter(
        (v: TopUser) => v.username !== user?.username
      );
      setTopUsers(filteredVisitors);
      console.log('🏆 Visitor list updated:', filteredVisitors);
    };

    socket.on(`visitor:update:${user.id}`, handler);

    return () => {
      socket.off(`visitor:update:${user.id}`, handler);
    };
  }, [user, user?.id]);

  // Wait for hydration before checking role - ÖNEMLİ: Sidebar görünür kalması için min-h-screen KULLANMAYALIM
  if (!isHydrated) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff7b00]" />
      </div>
    );
  }

  // Eğer user yoksa veya role corporate değilse (hydration tamamlandıktan sonra kontrol)
  if (!user || !isCorporateUser) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Yetkisiz Erişim
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Bu sayfaya sadece kurumsal kullanıcılar erişebilir.
          </p>
          {user && (
            <p className="text-xs text-gray-400 mt-2">
              Rolünüz: {user.role || 'belirtilmemiş'}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff7b00]" />
      </div>
    );
  }

  // Dark mode detection
  const isDark = typeof window !== "undefined" && document.documentElement.classList.contains("dark");

  // Chart configurations
  const visitsChartData = {
    labels: visits.map((v) => {
      const date = new Date(v.date);
      return date.toLocaleDateString("tr-TR", { month: "short", day: "numeric" });
    }),
    datasets: [
      {
        label: "Etkileşim Sayısı",
        data: visits.map((v) => v.count),
        borderColor: "#ff7b00",
        backgroundColor: isDark 
          ? "rgba(255, 123, 0, 0.15)" 
          : "rgba(255, 123, 0, 0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#ff7b00",
        pointBorderColor: isDark ? "#1a1a1a" : "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const wordsChartData = {
    labels: words.slice(0, 15).map((w) => w.word),
    datasets: [
      {
        label: "Kullanım Sayısı",
        data: words.slice(0, 15).map((w) => w.count),
        backgroundColor: "#ff7b00",
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark 
          ? "rgba(26, 26, 26, 0.95)" 
          : "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleColor: isDark ? "#fff" : "#fff",
        bodyColor: isDark ? "#fff" : "#fff",
        borderColor: "#ff7b00",
        borderWidth: 1,
        titleFont: {
          size: 14,
          weight: "bold" as const,
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: isDark ? "#9ca3af" : "#6b7280",
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: isDark 
            ? "rgba(255, 255, 255, 0.05)" 
            : "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          color: isDark ? "#9ca3af" : "#6b7280",
          font: {
            size: 11,
          },
          beginAtZero: true,
        },
      },
    },
  };

  const lineChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        grid: {
          color: isDark 
            ? "rgba(255, 123, 0, 0.15)" 
            : "rgba(255, 123, 0, 0.1)",
        },
      },
    },
  };

  return (
    <div className="flex justify-center gap-10 pt-6 px-6 max-w-7xl mx-auto">
      {/* 📰 Orta içerik */}
      <div className="flex-1 max-w-[1300px] mx-auto xl:mr-[420px]">
        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#ff7b00] flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8" />
            Analizlerim
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            İçeriğinizin performansını ve etkileşimlerini takip edin
          </p>
        </div>

        {/* ---- ANALİZ KARTLARI GRID ---- */}
        <div className="w-full max-w-[1280px] mx-auto mt-10 px-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* SOL SÜTUN */}
          <div className="flex flex-col gap-8">
            {/* Etkileşim Trendi */}
            <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm">
              <h3 className="text-orange-400 font-semibold mb-4">Etkileşim Trendi (Son 30 Gün)</h3>
              <div className="h-[300px]">
                <Line data={visitsChartData} options={lineChartOptions} />
              </div>
            </div>

            {/* En Çok Kullanılan Kelimeler */}
            <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm">
              <h3 className="text-orange-400 font-semibold mb-4">En Çok Kullanılan Kelimeler</h3>
              <div className="h-[300px]">
                <Bar data={wordsChartData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* SAĞ SÜTUN */}
          <div className="flex flex-col gap-8">
            {/* En Aktif Ziyaretçiler */}
            <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm">
              <h3 className="text-orange-400 font-semibold mb-4">En Aktif Ziyaretçiler</h3>
              <div className="space-y-3">
                {topUsers.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Henüz aktif ziyaretçi bulunmuyor
                  </p>
                ) : (
                  topUsers.map((u, index) => (
                    <Link
                      key={u.username}
                      href={`/profile/${u.username}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer hover:opacity-90"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20 text-[#ff7b00] font-bold text-sm">
                        {index + 1}
                      </div>
                      <img
                        src={u.avatar || "/users/default.jpg"}
                        alt={u.username}
                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/users/default.jpg";
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {u.fullName || u.username}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          @{u.username}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#ff7b00]">{u.activityCount}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          etkileşim
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Etkinlik Katılım Analizi - Kısa Özet */}
            <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm">
              <h3 className="text-orange-400 font-semibold mb-4">Etkinlik Katılım Analizi</h3>
              {eventStats.length > 0 ? (
                <div className="space-y-4">
                  {eventStats.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40"
                    >
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {event.title}
                      </h4>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          <span className="font-bold text-[#ff7b00]">{event.ticketCount}</span> / {event.totalCapacity} bilet
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">{event.commentCount}</span> yorum
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-8">
                  Henüz etkinlik bulunmuyor.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* 🎟️ Etkinlik Katılım Analizi - Accordion Yapısı */}
        <div className="bg-white dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-sm p-6 mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20 rounded-lg">
              <Ticket className="w-5 h-5 text-[#ff7b00]" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Etkinlik Katılım Analizi
              </h2>
              <div className="h-[2px] w-20 bg-[#ff7b00] rounded-full mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Etkinliklerinizin bilet satışları ve yorum istatistikleri
              </p>
            </div>
          </div>

          {eventStats.length > 0 ? (
            <div className="space-y-3">
              {eventStats.map((event) => (
                <div
                  key={event.id}
                  className="border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden transition-all hover:border-[#ff7b00]/30"
                >
                  {/* Accordion Header - Tıklanabilir */}
                  <div
                    onClick={() => setOpenEvent(openEvent === event.id ? null : event.id)}
                    className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 mb-1">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          <span className="font-bold text-[#ff7b00]">{event.ticketCount}</span> / {event.totalCapacity} bilet satıldı
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">{event.commentCount}</span> yorum
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {openEvent === event.id ? (
                        <ChevronUp className="w-5 h-5 text-[#ff7b00] transition-transform" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform" />
                      )}
                    </div>
                  </div>

                  {/* Accordion Content - Açılır Kısım */}
                  <div
                    className={`transition-all duration-500 ease-in-out overflow-hidden ${
                      openEvent === event.id
                        ? "max-h-[2000px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="p-4 bg-white dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700/40">
                      {/* Son alınan biletler */}
                      {event.recentTickets.length > 0 && (
                        <div className="mb-6">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                            Son Alınan 5 Bilet
                          </p>
                          <div className="space-y-2">
                            {event.recentTickets.map((ticket, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                              >
                                <div className="flex items-center gap-3">
                                  {ticket.avatar ? (
                                    <img
                                      src={ticket.avatar}
                                      alt={ticket.username}
                                      className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "/users/default.jpg";
                                      }}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20 flex items-center justify-center text-[#ff7b00] font-bold text-xs">
                                      {ticket.username.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="text-[#ff7b00] font-medium">
                                    {ticket.fullName || ticket.username}
                                  </span>
                                </div>
                                <span className="text-gray-500 dark:text-gray-400 text-xs">
                                  {new Date(ticket.createdAt).toLocaleTimeString("tr-TR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {event.recentTickets.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-6">
                          Henüz bu etkinlik için bilet satışı gerçekleşmemiş.
                        </p>
                      )}

                      {/* 🎨 Canlı Bilet Satış Grafiği */}
                      <div className="mt-6">
                        <TicketChart eventId={event.id} initialTicketCount={event.ticketCount} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Henüz etkinlik oluşturulmamış veya bilet satışı gerçekleşmemiş.
              </p>
            </div>
          )}
        </div>

        {/* 🎯 Top 5 En Çok Katılım Alan Etkinlikler Grafiği */}
        {eventStats.length > 0 && (
          <TopEventsChart
            events={eventStats.map((e) => ({
              id: e.id,
              title: e.title,
              ticketCount: e.ticketCount,
            }))}
          />
        )}
      </div>

      {/* Sağ sidebar */}
      <RightSidebar />
    </div>
  );
}

