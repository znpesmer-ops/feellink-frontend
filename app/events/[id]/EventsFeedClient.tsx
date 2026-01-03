"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Calendar,
  Ticket,
  Loader2,
  Edit3,
  Eye,
  Trash2,
  Users,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import RightSidebar from "@/components/right-sidebar";
import CreateEventModal from "@/components/events/CreateEventModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import toast from "react-hot-toast";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

interface Event {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  date: string;
  participantCount: number;
  tickets?: { price: number }[];
  price?: number;
  isFree?: boolean;
  location?: string;
  createdAt?: string;
  ownerId?: string;
  owner?: {
    id: string;
    username: string;
    fullName?: string;
    avatar?: string;
  };
  participants?: {
    userId: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
  }[];
}

export default function EventsFeedClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, capabilities } = useAuthStore();

  const [activeTab, setActiveTab] = useState<
    "all" | "mine" | "requested" | "approved"
  >("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [filtered, setFiltered] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // URL tab senkronizasyonu
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "mine" || tab === "requested" || tab === "approved") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Etkinlikleri çek
  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await api.get("/events/all");
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.events || [];
        setEvents(list);
        setFiltered(list);

        if (user) {
          const myRes = await api.get("/events/my");
          const myList = Array.isArray(myRes.data)
            ? myRes.data
            : myRes.data?.events || [];
          setMyEvents(myList);
        }
      } catch (e) {
        console.error(e);
        toast.error("Etkinlikler yüklenemedi");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [user]);

  // Tab filtreleme
  useEffect(() => {
    if (activeTab === "all") setFiltered(events);
    if (activeTab === "mine") setFiltered(myEvents);
    if (activeTab === "requested" && user) {
      setFiltered(
        events.filter((e) =>
          e.participants?.some(
            (p) => p.userId === user.id && p.status === "PENDING"
          )
        )
      );
    }
    if (activeTab === "approved" && user) {
      setFiltered(
        events.filter((e) =>
          e.participants?.some(
            (p) => p.userId === user.id && p.status === "APPROVED"
          )
        )
      );
    }
  }, [activeTab, events, myEvents, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1280px] mx-auto px-6 pt-6">
      <h1 className="text-3xl font-bold text-brand-orange mb-6">
        Etkinlikler
      </h1>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          Etkinlik bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((ev) => (
            <Link
              key={ev.id}
              href={`/events/${ev.id}`}
              className="border rounded-xl overflow-hidden hover:shadow-md transition"
            >
              <img
                src={
                  ev.coverImage
                    ? resolveImageUrl(ev.coverImage)
                    : "/placeholder.png"
                }
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h2 className="font-semibold">{ev.title}</h2>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(ev.date).toLocaleDateString("tr-TR")}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <Users size={14} /> {ev.participantCount || 0} katılımcı
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <RightSidebar />
    </div>
  );
}
