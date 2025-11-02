"use client";
import { useState, useEffect } from "react";
import { Plus, Eye, Edit3, Trash2, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import CreateCollectionModal from "@/components/collections/CreateCollectionModal";
import RightSidebar from "@/components/right-sidebar";

interface Collection {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  createdAt: string;
}

export default function CorporateCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

    async function fetchCollections() {
      try {
        const res = await api.get("/collections/my");
        setCollections(res.data);
      } catch (error) {
        console.error("Koleksiyonlar alınamadı:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCollections();
  }, [user, router]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu koleksiyonu silmek istediğinizden emin misiniz?")) {
      return;
    }

    try {
      await api.delete(`/collections/${id}`);
      setCollections(collections.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Silme hatası:", error);
      alert("Koleksiyon silinemedi.");
    }
  };

  const handleRefresh = async () => {
    try {
      const res = await api.get("/collections/my");
      setCollections(res.data);
    } catch (error) {
      console.error("Koleksiyonlar alınamadı:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
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
                🎨 Koleksiyonlarım
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Kurumunuza ait koleksiyonları yönetin, düzenleyin ve paylaşın.
              </p>
            </div>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#ff7b00] hover:bg-[#e36f00] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition"
            >
              <Plus size={18} /> Yeni Koleksiyon
            </button>
          </div>

          {/* İçerik */}
          {collections.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
              <p className="text-gray-500 text-lg">Henüz koleksiyon eklenmemiş.</p>
              <p className="text-sm text-gray-400">Yeni bir koleksiyon oluşturun.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {collections.map((col) => (
                <div
                  key={col.id}
                  className="bg-white dark:bg-[#1a1a1a]/70 backdrop-blur-md border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  <div className="relative h-52 bg-gray-100 dark:bg-gray-800">
                    <img
                      src={col.coverImage || "/placeholder.png"}
                      alt={col.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
                      {col.title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                      {col.description || "Açıklama eklenmemiş."}
                    </p>

                    <div className="flex justify-between items-center text-sm">
                      <button className="flex items-center gap-1 text-gray-500 hover:text-[#ff7b00] transition-colors">
                        <Eye size={16} /> Görüntüle
                      </button>
                      <button className="flex items-center gap-1 text-gray-500 hover:text-[#ff7b00] transition-colors">
                        <Edit3 size={16} /> Düzenle
                      </button>
                      <button 
                        onClick={() => handleDelete(col.id)}
                        className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} /> Sil
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Yeni Koleksiyon Modal */}
          <CreateCollectionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onCreated={handleRefresh}
          />
        </div>
      </div>

      {/* 🟠 Sağ sabit sidebar */}
      <RightSidebar />
    </div>
  );
}

