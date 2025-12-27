"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
// RightSidebar artık sadece ana sayfada görünüyor, burada gerek yok
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";
import { initSocket, getSocket } from "@/lib/socket";
import dynamic from "next/dynamic";
import { ColorMatchesCard } from "@/components/analytics/ColorMatchesCard";
import { useQuery } from "@tanstack/react-query";
import { SubscriptionPlanCode, UserRoleCode } from "@/types/capabilities";

// Dynamic import for TicketChart (SSR disabled for Chart.js)
const TicketChart = dynamic(() => import("@/components/analytics/TicketChart"), {
  ssr: false,
});

// Dynamic import for TopEventsChart
const TopEventsChart = dynamic(() => import("@/components/analytics/TopEventsChart"), {
  ssr: false,
});

// Dynamic import for KeywordsChart (SSR disabled for Recharts)
const KeywordsChart = dynamic(() => import("@/components/analytics/KeywordsChart"), {
  ssr: false,
});

const DEFAULT_ANALYTICS_AVATAR =
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=320&q=80";

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

interface ColorPaletteItem {
  hex: string;
  frequency?: number;
}

// Plan kontrolü kaldırıldı - artık herkes erişebilir
function isProPlan(
  user?: { plan?: SubscriptionPlanCode; roles?: UserRoleCode[]; isAdmin?: boolean; superAdmin?: boolean } | null,
  capabilities?: { plan?: SubscriptionPlanCode; roles?: UserRoleCode[] } | null
) {
  // Plan kontrolü kaldırıldı - her zaman true döndür
  return true;
}

// Blur / Overlay için koruma komponenti
type BlurGuardProps = {
  isPro: boolean;
  children: React.ReactNode;
};

function BlurGuard({ isPro, children }: BlurGuardProps) {
  const router = useRouter();

  if (isPro) {
    // Pro ise hiç dokunma, olduğu gibi göster
    return <>{children}</>;
  }

  // Dark mode kontrolü
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div className="relative">
      {/* Mode'a göre farklı blur değerleri */}
      <div
        className={`pointer-events-none select-none transition-all duration-300 ${
          isDarkMode
            ? 'blur-[4px] opacity-75' // Dark mode: daha hafif blur, içerik daha belirgin
            : 'blur-[6px] opacity-65' // Light mode: hafif bulanık, içerik seçilebilir
        }`}
      >
        {children}
      </div>

      {/* Premium glass overlay with vignette */}
      <div
        className={`pointer-events-auto absolute inset-0 flex flex-col items-center justify-center rounded-2xl px-6 transition-all duration-300 ${
          isDarkMode
            ? 'backdrop-blur-[4px] bg-black/25' // Dark mode: daha hafif overlay
            : 'backdrop-blur-[6px] bg-white/35' // Light mode: hafif overlay
        }`}
      >
        {/* Vignette efekti (çok hafif kararma – profesyonel görünüm) */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-black/10 dark:from-transparent dark:to-black/30 rounded-2xl" />

        {/* Plan kontrolü kaldırıldı - artık herkes erişebilir */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-3">
          <p className="text-center text-sm text-gray-600 dark:text-gray-300 max-w-xs leading-relaxed">
            Bu özellik tüm kullanıcılara açıktır.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, capabilities, accessToken } = useAuthStore();
  const pro = isProPlan(user, capabilities);
  const [visits, setVisits] = useState<VisitData[]>([]);
  const [words, setWords] = useState<WordData[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [eventStats, setEventStats] = useState<EventStat[]>([]);
  const [colorPalette, setColorPalette] = useState<ColorPaletteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [openEvent, setOpenEvent] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d'>('30d');
  const [topPerforming, setTopPerforming] = useState<any>(null);
  const [saveAnalytics, setSaveAnalytics] = useState<any>(null);
  const [sourceDistribution, setSourceDistribution] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [lowEngagement, setLowEngagement] = useState<any>(null);

  const resolveAvatarUrl = (avatar?: string | null) => {
    if (!avatar || avatar.trim() === "") {
      return DEFAULT_ANALYTICS_AVATAR;
    }
    if (avatar.startsWith("http")) {
      if (avatar.includes("localhost:3000")) {
        return DEFAULT_ANALYTICS_AVATAR;
      }
      return avatar;
    }
    return DEFAULT_ANALYTICS_AVATAR;
  };

  // Get user posts with colorPalette data
  const { data: posts } = useQuery({
    queryKey: ["userPosts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const response = await api.get(`/posts/user/${user.id}`);
        return response.data || [];
      } catch (error) {
        console.error("Gönderiler alınamadı:", error);
        return [];
      }
    },
    enabled: !!user?.id && !!accessToken,
  });

  // Get top 5 color matches
  const { data: colorMatches, isLoading: isLoadingColorMatches, error: colorMatchesError } = useQuery({
    queryKey: ["color-match", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const response = await api.get("/analytics/color-match/top5");
        return response.data || [];
      } catch (error: any) {
        console.error("Renk eşleşmeleri alınamadı:", error);
        // Hata durumunda boş array döndür (kullanıcı deneyimini bozmamak için)
        // Backend zaten hata durumunda boş array döndürüyor
        return [];
      }
    },
    enabled: !!user?.id && !!accessToken,
    retry: 1, // Sadece 1 kez tekrar dene
    retryDelay: 1000, // 1 saniye bekle
  });

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
    if (isHydrated && user && capabilities) {
      console.log('🔍 Analytics Page - Roles:', capabilities.roles, 'Pro Plan:', pro, 'AccessToken:', !!accessToken);
    }
  }, [user, capabilities, pro, isHydrated, accessToken]);

  useEffect(() => {
    if (!isHydrated || !user || !capabilities) {
      return;
    }

    async function fetchAnalytics() {
      try {
        setLoading(true);
        
        // 🔒 KRİTİK: Auth token kontrolü
        if (!accessToken) {
          const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
          if (!tokenFromStorage) {
            console.error('[Analytics] No access token - redirecting to login');
            useAuthStore.getState().clearAuth();
            router.push('/login');
            return;
          }
        }
        
        console.log('[Analytics] 🔄 Fetching analytics data...', { 
          hasToken: !!accessToken,
          dateRange,
          userId: user?.id 
        });
        
        // 401 hatası durumunda catch et ve loading'i false yap
        const handle401 = (err: any) => {
          if (err?.response?.status === 401) {
            console.error('[Analytics] Unauthorized - redirecting to login');
            useAuthStore.getState().clearAuth();
            router.push('/login');
            throw err;
          }
          return err;
        };
        
        const [visitsRes, wordsRes, usersRes, eventsRes, colorPaletteRes, topPerformingRes, saveAnalyticsRes, sourceRes, comparisonRes, lowEngagementRes] = await Promise.all([
          api.get(`/analytics/visits?range=${dateRange}`).catch(handle401),
          api.get("/analytics/words").catch(handle401),
          api.get("/analytics/top-users").catch(handle401),
          api.get("/analytics/event-stats").catch(handle401),
          api.get("/analytics/color-palette").catch(() => ({ data: [] })), // Renk paleti yoksa boş array
          api.get(`/analytics/top-performing?range=${dateRange}`).catch(() => ({ data: null })),
          api.get(`/analytics/saves?range=${dateRange}`).catch(() => ({ data: null })),
          api.get(`/analytics/sources?range=${dateRange}`).catch(handle401),
          api.get(`/analytics/comparison?range=${dateRange}`).catch(() => ({ data: null })),
          api.get("/analytics/low-engagement").catch(() => ({ data: null })),
        ]);

        // 🔒 KRİTİK: Console log - gerçek data'yı gör
        console.log('[Analytics] ✅ API Response:', {
          visits: visitsRes?.data,
          words: wordsRes?.data,
          users: usersRes?.data,
          events: eventsRes?.data,
        });

        // 🔒 GÜVENLİ ARRAY NORMALİZASYONU - Backend response format'larını handle et
        // Visits: Array veya { visits: [] } formatında gelebilir
        // State set ederken her zaman array olduğundan emin ol
        const safeVisitsForState: VisitData[] = Array.isArray(visitsRes?.data)
          ? visitsRes.data
          : (visitsRes?.data?.visits && Array.isArray(visitsRes.data.visits))
          ? visitsRes.data.visits
          : [];
        setVisits(safeVisitsForState);
        
        // Words: Array veya { words: [] } formatında gelebilir
        const safeWords = Array.isArray(wordsRes?.data)
          ? wordsRes.data
          : (wordsRes?.data?.words && Array.isArray(wordsRes.data.words))
          ? wordsRes.data.words
          : [];
        setWords(safeWords);
        
        // 🚫 Yedek güvenlik katmanı: Kendini listeye dahil etme
        // Users: Array veya { users: [] } formatında gelebilir
        const usersData = Array.isArray(usersRes?.data)
          ? usersRes.data
          : (usersRes?.data?.users && Array.isArray(usersRes.data.users))
          ? usersRes.data.users
          : [];
        const filteredUsers = Array.isArray(usersData)
          ? usersData.filter((u: TopUser) => u.username !== user?.username)
          : [];
        setTopUsers(filteredUsers);
        
        // EventStats: Array veya { events: [] } formatında gelebilir
        const safeEventStats = Array.isArray(eventsRes?.data)
          ? eventsRes.data
          : (eventsRes?.data?.events && Array.isArray(eventsRes.data.events))
          ? eventsRes.data.events
          : [];
        setEventStats(safeEventStats);
        setColorPalette(Array.isArray(colorPaletteRes?.data) ? colorPaletteRes.data : []);
        setTopPerforming(topPerformingRes?.data || null);
        setSaveAnalytics(saveAnalyticsRes?.data || null);
        setSourceDistribution(sourceRes?.data || null);
        setComparison(comparisonRes?.data || null);
        setLowEngagement(lowEngagementRes?.data || null);
        
        console.log('[Analytics] ✅ Data set successfully');
      } catch (err: any) {
        console.error("[Analytics] ❌ Analiz verileri alınamadı:", err);
        
        // 401 hatası durumunda login'e yönlendir
        if (err?.response?.status === 401) {
          console.error('[Analytics] Unauthorized - redirecting to login');
          useAuthStore.getState().clearAuth();
          router.push('/login');
          return;
        }
        
        toast.error(err.response?.data?.message || "Analiz verileri yüklenemedi");
      } finally {
        // 🔒 KRİTİK: finally bloğu - loading'i GARANTİ kapat
        console.log('[Analytics] 🔒 Setting loading to false');
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [user, capabilities, pro, isHydrated, dateRange, router]);

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
    const handler = (visitorsData: TopUser[] | { users?: TopUser[] }) => {
      // 🔒 GÜVENLİ ARRAY NORMALİZASYONU
      const safeVisitorsData = Array.isArray(visitorsData)
        ? visitorsData
        : visitorsData?.users ?? [];
      
      // 🚫 Yedek güvenlik katmanı: Kendini listeye dahil etme
      const filteredVisitors = safeVisitorsData.filter(
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

  // 🔥 KRİTİK: Token yoksa veya geçersizse login'e yönlendir - HOOK'LAR ÖNCE!
  useEffect(() => {
    if (!accessToken) {
      const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!tokenFromStorage) {
        router.push('/login');
      }
    }
  }, [accessToken, router]);

  // 🔒 GÜVENLİ VISITS NORMALİZASYONU - useMemo ile optimize et
  // ⚠️ ÖNEMLİ: Hook'lar conditional return'lerden ÖNCE çağrılmalı (Rules of Hooks)
  // Backend ne dönerse dönsün, UI asla patlamaz
  const safeVisits = useMemo((): VisitData[] => {
    // Array ise direkt döndür
    if (Array.isArray(visits)) return visits;
    
    // Backend { visits: [] } formatında dönebilir
    const visitsObj = visits as any;
    if (visitsObj?.visits && Array.isArray(visitsObj.visits)) {
      return visitsObj.visits;
    }
    
    // Hiçbiri değilse boş array döndür
    return [];
  }, [visits]);
  
  // 🔒 İlk render crash'ini tamamen kapat - guard
  // Eğer safeVisits hala array değilse (çok nadir edge case), boş array kullan
  const finalSafeVisits = Array.isArray(safeVisits) ? safeVisits : [];

  // Wait for hydration before checking role - ÖNEMLİ: Sidebar görünür kalması için min-h-screen KULLANMAYALIM
  if (!isHydrated) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF8A00]" />
      </div>
    );
  }

  // Eğer user yoksa veya capabilities yoksa (hydration tamamlandıktan sonra kontrol)
  if (!user || !capabilities) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Giriş Gerekli
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Bu sayfaya erişmek için lütfen giriş yapın.
          </p>
        </div>
      </div>
    );
  }
  
  if (!accessToken) {
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!tokenFromStorage) {
      return (
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF8A00] mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Yönlendiriliyorsunuz...</p>
          </div>
        </div>
      );
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF8A00]" />
      </div>
    );
  }

  // Dark mode detection
  const isDark = typeof window !== "undefined" && document.documentElement.classList.contains("dark");

  // Chart color constants - Feellink corporate colors
  const chartColorPrimary = "#1E88E5"; // Mavi - ana renk
  const chartAccent = "#FF8A00"; // Turuncu - vurgu rengi

  // Chart configurations
  // 🔒 Tüm .map kullanımlarında finalSafeVisits kullan
  const visitsChartData = {
    labels: finalSafeVisits.map((v: VisitData) => {
      const date = new Date(v.date);
      return date.toLocaleDateString("tr-TR", { month: "short", day: "numeric" });
    }),
    datasets: [
      {
        label: "Etkileşim Sayısı",
        data: finalSafeVisits.map((v: VisitData) => v.count),
        borderColor: chartColorPrimary, // Mavi ana çizgi
        backgroundColor: isDark 
          ? "rgba(30, 136, 229, 0.15)" 
          : "rgba(30, 136, 229, 0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: chartAccent, // Turuncu noktalar
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
        backgroundColor: chartColorPrimary, // Mavi bar
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
        borderColor: chartAccent, // Turuncu border
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
            ? "rgba(30, 136, 229, 0.15)" 
            : "rgba(30, 136, 229, 0.1)", // Mavi grid
        },
      },
    },
  };

  return (
    <div className="w-full px-6 py-4">
      {/* 🔥 KRİTİK: Geniş container - tam ekran genişliği */}
      <div className="max-w-7xl mx-auto">
        {/* Başlık */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-[#FF8A00] flex items-center gap-3">
              <TrendingUp className="w-8 h-8" />
              Analizlerim
            </h1>
            {/* Zaman Kırılımı Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['today', '7d', '30d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    dateRange === range
                      ? 'bg-[#FF8A00] text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {range === 'today' ? 'Bugün' : range === '7d' ? '7g' : '30g'}
                </button>
              ))}
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            İçeriğinizin performansını ve etkileşimlerini takip edin
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Ayrıntılı grafikler, renk analizi, etkinlik katılım istatistikleri ve en
            çok etkileşim aldığınız içerikler.
          </p>
        </div>

        {/* ---- ANALİZ KARTLARI GRID ---- */}
        {/* 🔥 KRİTİK: Responsive 3 kolonlu grid - ferah görünüm */}
        <BlurGuard isPro={pro}>
          <div className="w-full mt-10 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
          {/* Etkileşim Trendi */}
          <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#FF8A00] font-semibold">
                Etkileşim Trendi
                {dateRange === 'today' && ' (Bugün)'}
                {dateRange === '7d' && ' (Son 7 Gün)'}
                {dateRange === '30d' && ' (Son 30 Gün)'}
              </h3>
            </div>
            <div className="h-[300px]">
              <Line data={visitsChartData} options={lineChartOptions} />
            </div>
            {comparison && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {comparison.likes.change > 0 ? '↑' : comparison.likes.change < 0 ? '↓' : '→'} 
                  {' '}Beğeni: {comparison.likes.change > 0 ? '+' : ''}{comparison.likes.change}% (geçen döneme göre)
                </p>
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
              {dateRange === 'today' 
                ? 'Günlük etkileşimleriniz saatlik olarak gösterilmektedir.'
                : 'Bu tür içerikler daha çok etkileşim alıyor.'}
            </p>
          </div>

          {/* En Çok Kullanılan Kelimeler */}
          <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm">
            <h3 className="text-[#FF8A00] font-semibold mb-4">En Çok Kullanılan Kelimeler</h3>
            <KeywordsChart data={words} />
          </div>

          {/* En Aktif Ziyaretçiler */}
          <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-[#1E88E5] shadow-sm">
            <h3 className="text-[#FF8A00] font-semibold mb-4">En Aktif Ziyaretçiler</h3>
            <div className="space-y-3">
              {!Array.isArray(topUsers) || topUsers.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Henüz aktif ziyaretçi bulunmuyor
                </p>
              ) : (
                topUsers.map((u, index) => (
                  <Link
                    key={u.username}
                    href={`/profile/${u.username}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-[#1E88E5] hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer hover:opacity-90"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FF8A00]/10 dark:bg-[#FF8A00]/20 text-[#FF8A00] font-bold text-sm">
                      {index + 1}
                    </div>
                    <img
                      src={resolveAvatarUrl(u.avatar)}
                      alt={u.username}
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_ANALYTICS_AVATAR;
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
                      <p className="font-bold text-[#1E88E5]">{u.activityCount}</p>
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
          {eventStats.length > 0 && (
            <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm">
              <h3 className="text-[#FF8A00] font-semibold mb-4">Etkinlik Katılım Analizi</h3>
              <div className="space-y-4">
                {eventStats.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border-t-4 border-[#1E88E5] border-l border-r border-b border-gray-200 dark:border-gray-700/40"
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {event.title}
                    </h4>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        <span className="font-bold text-[#1E88E5]">{event.ticketCount}</span> / {event.totalCapacity} bilet
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        <span className="font-semibold">{event.commentCount}</span> yorum
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Renk Eşleşmeleri - Sadece artwork'e sahip kullanıcılar için */}
          {user?.id && (
            <ColorMatchesCard userId={user.id} />
          )}

          {/* Sana En Yakın Renklerle Eşleşen Kişiler */}
          <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm">
            <h3 className="text-[#FF8A00] font-semibold mb-4">Sana En Yakın Renklerle Eşleşen Kişiler</h3>

            {isLoadingColorMatches ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#FF8A00]" />
              </div>
            ) : colorMatchesError ? (
              <p className="text-sm opacity-60 text-gray-400 dark:text-gray-500">
                Renk eşleşmeleri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
              </p>
            ) : !colorMatches || colorMatches.length === 0 ? (
              <p className="text-sm opacity-60 text-gray-400 dark:text-gray-500">
                Yeterli renk verisi bulunamadı.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {Array.isArray(colorMatches) && colorMatches.length > 0 ? colorMatches.map((match: any) => (
                  <div
                    key={match.userId}
                    className="flex items-center justify-between bg-gray-50 dark:bg-[#161616] p-3 rounded-lg border border-gray-200 dark:border-[#222] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveAvatarUrl(match.avatar)}
                        alt={match.username}
                        className="w-10 h-10 rounded-full border border-gray-300 dark:border-[#333] object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_ANALYTICS_AVATAR;
                        }}
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          @{match.username}
                        </div>
                        {match.commonColors && match.commonColors.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {match.commonColors.slice(0, 3).map((color: string, idx: number) => (
                              <div
                                key={idx}
                                className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[#1E88E5] font-semibold text-sm">
                      %{match.similarity}
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    Henüz renk eşleşmesi bulunmuyor
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Top Performing Content */}
          {topPerforming && (
            <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm">
              <h3 className="text-[#FF8A00] font-semibold mb-4">Bu Dönemin Öne Çıkanları</h3>
              <div className="space-y-4">
                {topPerforming.mostViewed && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40">
                    {topPerforming.mostViewed.thumbnail && (
                      <img
                        src={topPerforming.mostViewed.thumbnail}
                        alt={topPerforming.mostViewed.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {topPerforming.mostViewed.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ↑ En çok görüntülenen
                      </p>
                    </div>
                  </div>
                )}
                {topPerforming.mostCommented && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40">
                    {topPerforming.mostCommented.thumbnail && (
                      <img
                        src={topPerforming.mostCommented.thumbnail}
                        alt={topPerforming.mostCommented.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {topPerforming.mostCommented.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ↑ En çok yorum alan
                      </p>
                    </div>
                  </div>
                )}
                {topPerforming.mostSaved && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40">
                    {topPerforming.mostSaved.thumbnail && (
                      <img
                        src={topPerforming.mostSaved.thumbnail}
                        alt={topPerforming.mostSaved.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {topPerforming.mostSaved.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ↑ En çok kaydedilen
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 italic">
                Yorum alan içerikler daha uzun süre öne çıkıyor.
              </p>
            </div>
          )}

          {/* Kaydedilme Analizi */}
          {saveAnalytics && (
            <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm">
              <h3 className="text-[#FF8A00] font-semibold mb-4">Kaydedilme Etkisi</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-[#1E88E5]">{saveAnalytics.totalSaves}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Kaydedilme</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#FF8A00]">%{saveAnalytics.saveRate}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Kaydetme Oranı</p>
                </div>
                {saveAnalytics.mostSaved && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                      En Çok Kaydedilen
                    </p>
                    <div className="flex items-center gap-3">
                      {saveAnalytics.mostSaved.thumbnail && (
                        <img
                          src={saveAnalytics.mostSaved.thumbnail}
                          alt={saveAnalytics.mostSaved.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {saveAnalytics.mostSaved.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {saveAnalytics.mostSaved.saves} kaydetme
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 italic">
                Kaydedilen içerikler uzun vadeli etki gösterir.
              </p>
            </div>
          )}

          {/* Keşfet Kaynak Dağılımı */}
          {sourceDistribution && (
            <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm">
              <h3 className="text-[#FF8A00] font-semibold mb-4">Keşfet Kaynak Dağılımı</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Keşfet</span>
                    <span className="text-sm font-semibold text-[#1E88E5]">%{sourceDistribution.explore}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-[#1E88E5] h-2 rounded-full"
                      style={{ width: `${sourceDistribution.explore}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Profil</span>
                    <span className="text-sm font-semibold text-[#FF8A00]">%{sourceDistribution.profile}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-[#FF8A00] h-2 rounded-full"
                      style={{ width: `${sourceDistribution.profile}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Ana Sayfa</span>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">%{sourceDistribution.home}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gray-400 dark:bg-gray-500 h-2 rounded-full"
                      style={{ width: `${sourceDistribution.home}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 italic">
                Keşfette görünürlük artıyor.
              </p>
            </div>
          )}

          {/* Pasif Uyarı Sistemi */}
          {lowEngagement && lowEngagement.hasWarning && (
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-300 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ⚠️ Bazı içerikler son 14 günde daha az etkileşim alıyor ({lowEngagement.count} içerik).
              </p>
            </div>
          )}

          {/* 🎨 Renk Analizi Kartı — TOP COLORS CLOUD */}
          {(() => {
            // Tüm gönderilerden renkleri topla ve say
            const colorCount: Record<string, number> = {};
            const postsWithColors = (posts || []).filter((p: any) => p.colorPalette && Array.isArray(p.colorPalette) && p.colorPalette.length > 0);
            
            postsWithColors.forEach((p: any) => {
              if (p.colorPalette && Array.isArray(p.colorPalette)) {
                p.colorPalette.forEach((hex: string) => {
                  if (hex && typeof hex === 'string') {
                    colorCount[hex] = (colorCount[hex] || 0) + 1;
                  }
                });
              }
            });

            // En çok kullanılan renkleri sırala
            const totalColorUsages = Object.values(colorCount).reduce((sum, count) => sum + count, 0);
            const topColors = Object.entries(colorCount)
              .map(([color, count]) => ({
                color,
                count,
                percent: totalColorUsages > 0 ? (count / totalColorUsages) * 100 : 0,
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 12); // En çok kullanılan 12 renk

            return (
              <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-[#1E88E5]/40 shadow-sm">
                <h3 className="text-[#FF8A00] font-semibold mb-4">Renk Analizi</h3>

                {topColors.length > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    {topColors.map((c, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          style={{
                            backgroundColor: c.color,
                            width: 50,
                            height: 50,
                            borderRadius: 8,
                            border: "2px solid rgba(255,255,255,0.2)",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                          }}
                          title={c.color}
                          className="transition-transform hover:scale-110 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">
                          {Math.round(c.percent)}%
                        </span>
                        <span className="text-xs opacity-60 text-gray-500 dark:text-gray-400 font-mono">
                          {c.color}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 text-sm">Henüz renk analizi yapılmış eser bulunmuyor.</p>
                )}
              </div>
            );
          })()}
          </div>

          {/* 🎟️ Etkinlik Katılım Analizi - Accordion Yapısı */}
          {/* 🔥 KRİTİK: Tam genişlik - grid dışında */}
          <div className="bg-white dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-sm p-6 mt-6 w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#FF8A00]/10 dark:bg-[#FF8A00]/20 rounded-lg">
              <Ticket className="w-5 h-5 text-[#FF8A00]" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Etkinlik Katılım Analizi
              </h2>
              <div className="h-[2px] w-20 bg-[#1E88E5] rounded-full mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Etkinliklerinizin bilet satışları ve yorum istatistikleri
              </p>
            </div>
          </div>

          {Array.isArray(eventStats) && eventStats.length > 0 ? (
            <div className="space-y-3">
              {eventStats.map((event) => (
                <div
                  key={event.id}
                  className="border-t-4 border-[#1E88E5] border-l border-r border-b border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden transition-all hover:border-[#FF8A00]/30"
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
                          <span className="font-bold text-[#1E88E5]">{event.ticketCount}</span> / {event.totalCapacity} bilet satıldı
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">{event.commentCount}</span> yorum
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {openEvent === event.id ? (
                        <ChevronUp className="w-5 h-5 text-[#FF8A00] transition-transform" />
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
                                      src={resolveAvatarUrl(ticket.avatar)}
                                      alt={ticket.username}
                                      className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = DEFAULT_ANALYTICS_AVATAR;
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
        {/* 🔥 KRİTİK: Tam genişlik - grid dışında */}
        {Array.isArray(eventStats) && eventStats.length > 0 && (
          <div className="w-full mt-6">
            <TopEventsChart
              events={eventStats.map((e) => ({
                id: e.id,
                title: e.title,
                ticketCount: e.ticketCount,
              }))}
            />
          </div>
        )}
        </BlurGuard>
      </div>
    </div>
  );
}

