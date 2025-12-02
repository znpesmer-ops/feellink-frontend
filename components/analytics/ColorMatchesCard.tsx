"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Palette, Loader2, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

interface ColorMatch {
  user: {
    id: string;
    username: string;
    fullName?: string;
    avatar?: string;
    isVerified?: boolean;
  };
  ortakRenkSayisi: number;
  ortakRenkler: string[];
  matchScore: number;
  similarityPercentage: number;
}

interface ColorMatchesCardProps {
  userId: string;
}

export function ColorMatchesCard({ userId }: ColorMatchesCardProps) {
  const router = useRouter();

  const { data: matches, isLoading } = useQuery<ColorMatch[]>({
    queryKey: ["color-matches", userId],
    queryFn: async () => {
      const response = await api.get(`/posts/color-matches/${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });

  const { data: paletteData } = useQuery({
    queryKey: ["color-palette", userId],
    queryFn: async () => {
      const response = await api.get(`/posts/color-palette/${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff7b00]" />
        </div>
      </div>
    );
  }

  const userPalette = paletteData?.palette || [];
  const colorMatches = matches || [];

  if (colorMatches.length === 0 && userPalette.length === 0) {
    return null; // Renk analizi yapılmamış eserler varsa kartı gösterme
  }

  return (
    <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-[#ff7b00]/10 dark:bg-[#ff7b00]/20 rounded-lg">
          <Palette className="w-5 h-5 text-[#ff7b00]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Renk Eşleşmeleri
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Seninle benzer renk paleti kullanan sanatçılar
          </p>
        </div>
      </div>

      {/* Kullanıcının Renk Paleti */}
      {userPalette.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
            Senin Renk Paletin
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {userPalette.slice(0, 10).map((color: string, index: number) => (
              <div
                key={index}
                className="w-12 h-12 rounded-lg shadow-sm border-2 border-white dark:border-gray-700"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Renk Eşleşmeleri Listesi */}
      {colorMatches.length > 0 ? (
        <div className="space-y-3">
          {colorMatches.slice(0, 5).map((match) => (
            <div
              key={match.user.id}
              className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 hover:border-[#ff7b00]/30 transition-colors cursor-pointer group"
              onClick={() => router.push(`/profile/${match.user.username}`)}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Profil Bilgisi */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img
                    src={resolveImageUrl(match.user.avatar) || "/images/avatar-placeholder.png"}
                    alt={match.user.username}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/avatar-placeholder.png";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {match.user.fullName || match.user.username}
                      </p>
                      {match.user.isVerified && (
                        <span className="text-[#ff7b00]">✓</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{match.user.username}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-semibold text-[#ff7b00]">
                        Uyum Skoru: %{match.similarityPercentage}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {match.ortakRenkSayisi} ortak renk
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ortak Renk Paleti */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {match.ortakRenkler.map((color, index) => (
                    <div
                      key={index}
                      className="w-8 h-8 rounded-md shadow-sm border border-white dark:border-gray-700"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  {match.ortakRenkler.length === 0 && (
                    <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-gray-700" />
                  )}
                </div>

                {/* External Link Icon */}
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#ff7b00] transition-colors flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Palette className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Henüz benzer renk paleti kullanan sanatçı bulunamadı.
          </p>
        </div>
      )}
    </div>
  );
}



