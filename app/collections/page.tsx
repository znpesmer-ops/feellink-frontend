"use client";
import { useState, useEffect } from "react";
import { Plus, Loader2, UserCircle2, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import CreateCollectionModal from "@/components/collections/CreateCollectionModal";
import { ProRoleBadge } from "@/components/ProRoleBadge";

interface Collection {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  createdAt: string;
  owner?: {
    id: string;
    username: string | null;
    fullName: string | null;
    avatar: string | null;
    roles: string[] | null;
  };
}

type FilterType = "Tümü" | "Kurumsal" | "Sanatçı" | "Popüler" | "Yeni";

export default function CollectionsPage() {
  const pathname = usePathname();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("Tümü");
  const { user, capabilities, accessToken } = useAuthStore();

  // Rol bazlı kontrol: sadece artist ve corporate koleksiyon oluşturabilir
  const roles = capabilities?.roles ?? user?.roles ?? [];
  const canCreateCollection = roles.includes("artist") || roles.includes("corporate");

  useEffect(() => {
    if (!accessToken) return;

    async function fetchCollections() {
      try {
        setLoading(true);
        const res = await api.get<Collection[]>("/collections/public");
        setCollections(res.data || []);
        setFilteredCollections(res.data || []);
      } catch (error) {
        console.error("Koleksiyonlar alınamadı:", error);
        setCollections([]);
        setFilteredCollections([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCollections();
  }, [accessToken]);

  // Filtreleme mantığı
  useEffect(() => {
    let filtered = [...collections];

    switch (activeFilter) {
      case "Kurumsal":
        filtered = collections.filter(
          (col) => col.owner?.roles && Array.isArray(col.owner.roles) && col.owner.roles.includes("corporate")
        );
        break;
      case "Sanatçı":
        filtered = collections.filter(
          (col) => col.owner?.roles && Array.isArray(col.owner.roles) && col.owner.roles.includes("artist")
        );
        break;
      case "Popüler":
        // Şimdilik en yeni olanları göster (ileride beğeni/yorum sayısına göre sıralanabilir)
        filtered = [...collections].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "Yeni":
        filtered = [...collections].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        filtered = collections;
    }

    setFilteredCollections(filtered);
  }, [activeFilter, collections]);

  const handleRefresh = async () => {
    try {
      const res = await api.get<Collection[]>("/collections/public");
      setCollections(res.data || []);
      setFilteredCollections(res.data || []);
    } catch (error) {
      console.error("Koleksiyonlar alınamadı:", error);
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
              Koleksiyonlar
            </h1>
            {canCreateCollection && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#ff7b00] hover:bg-[#e36f00] text-white font-medium transition shadow-md whitespace-nowrap flex items-center gap-2"
              >
                <Plus size={18} />
                Koleksiyon Oluştur
              </button>
            )}
          </div>
          {/* Açıklama metni altında */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Sanatçıların ve kurumların oluşturduğu koleksiyonları keşfedin.
          </p>
        </div>

        {/* Filtre Butonları */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {(["Tümü", "Kurumsal", "Sanatçı", "Popüler", "Yeni"] as FilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                activeFilter === filter
                  ? "border-[#ff7b00] text-[#ff7b00] bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-[#ff7b00] hover:border-[#ff7b00]"
              }`}
            >
              {filter === "Tümü" && "🎨"}
              {filter === "Kurumsal" && "🖼"}
              {filter === "Sanatçı" && "👤"}
              {filter === "Popüler" && "🔥"}
              {filter === "Yeni" && "🆕"}
              {" "}
              {filter}
            </button>
          ))}
        </div>

        {/* Koleksiyon Grid */}
        {filteredCollections.length === 0 ? (
          <div className="w-full py-20 flex flex-col items-center text-center opacity-70">
            <Sparkles className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-6" />
            <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
              Henüz koleksiyon bulunmuyor
            </h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              {activeFilter !== "Tümü"
                ? "Bu filtreye uygun koleksiyon bulunmuyor."
                : "Yeni bir koleksiyon oluşturarak başlayabilirsiniz."}
            </p>
            {canCreateCollection && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#ff7b00] hover:bg-[#e36f00] text-white font-medium transition shadow-md flex items-center gap-2"
              >
                <Plus size={18} />
                Koleksiyon Oluştur
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCollections.map((col) => (
              <Link
                key={col.id}
                href={`/collections/${col.id}`}
                className="group relative rounded-xl overflow-hidden bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-white/5 hover:scale-[1.02] transition-all duration-300 shadow-sm hover:shadow-lg cursor-pointer"
              >
                {/* Kapak Görseli */}
                <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  {col.coverImage ? (
                    <img
                      src={col.coverImage}
                      alt={col.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#ff7b00]/20 to-[#ff7b00]/5 flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-[#ff7b00]/40" />
                    </div>
                  )}
                </div>

                {/* Koleksiyon Bilgileri */}
                <div className="p-4 flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                    {col.title}
                  </h3>
                  {col.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {col.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm mt-1">
                    {col.owner?.avatar ? (
                      <img
                        src={col.owner.avatar}
                        alt={col.owner.username || "Kullanıcı"}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircle2 className="w-5 h-5" />
                    )}
                    <span className="truncate flex items-center gap-1">
                      @{col.owner?.username || "bilinmeyen"}
                      <ProRoleBadge roles={col.owner?.roles as string[]} plan={col.owner?.plan as string} />
                    </span>
                    <span>•</span>
                    <span className="text-xs">
                      {new Date(col.createdAt).toLocaleDateString("tr-TR", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex justify-center items-center text-white text-sm backdrop-blur-sm rounded-xl">
                  <span className="font-semibold">Koleksiyonu Gör</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Yeni Koleksiyon Modal */}
        {canCreateCollection && (
          <CreateCollectionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onCreated={handleRefresh}
          />
        )}
      </div>
    </div>
  );
}
