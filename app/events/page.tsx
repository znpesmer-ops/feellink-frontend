"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Ticket, Loader2 } from "lucide-react";
import api from "@/lib/api";
import RightSidebar from "@/components/right-sidebar";

interface Event {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  date: string;
  participantCount: number;
  tickets?: { price: number }[];
}

export default function EventsFeedPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filtered, setFiltered] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await api.get("/events/all");
        setEvents(res.data);
        setFiltered(res.data);
      } catch (err) {
        console.error("Etkinlikler alınamadı:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const applyFilter = (type: string) => {
    setFilter(type);
    const now = new Date();
    let filteredData = [...events];

    if (type === "upcoming") filteredData = events.filter(e => new Date(e.date) >= now);
    if (type === "past") filteredData = events.filter(e => new Date(e.date) < now);
    if (type === "free") filteredData = events.filter(e => !e.tickets?.length || e.tickets[0].price === 0);
    if (type === "paid") filteredData = events.filter(e => e.tickets?.length && e.tickets[0].price > 0);

    setFiltered(filteredData);
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
      {/* Orta içerik */}
      <div className="flex-1 max-w-[1200px] space-y-10 mx-auto xl:mr-[420px]">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#ff7b00]">
            Etkinlikler
          </h1>
        </div>

        {/* Filtre Çubuğu */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { key: "all", label: "Tümü" },
            { key: "upcoming", label: "Yaklaşan" },
            { key: "past", label: "Geçmiş" },
            { key: "free", label: "Ücretsiz" },
            { key: "paid", label: "Ücretli" },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => applyFilter(btn.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === btn.key
                  ? "bg-[#ff7b00] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-[#ff7b00]"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center mt-20 text-gray-500 text-lg">
            Filtreye uygun etkinlik bulunamadı.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="bg-white dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group"
              >
                <div className="relative h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <img
                    src={ev.coverImage || "/placeholder.png"}
                    alt={ev.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="p-4 flex flex-col justify-between min-h-[160px]">
                  <div>
                    <h2 className="font-semibold text-lg mb-1 text-gray-900 dark:text-gray-100 line-clamp-1">
                      {ev.title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                      {ev.description || "Açıklama bulunmuyor."}
                    </p>
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <Calendar size={14} />
                      {new Date(ev.date).toLocaleDateString("tr-TR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#ff7b00] font-bold">
                        {ev.tickets && ev.tickets.length > 0
                          ? `${ev.tickets[0].price} ₺`
                          : "Ücretsiz"}
                      </span>
                      <button className="text-sm text-white bg-[#ff7b00] hover:bg-[#e36f00] px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                        <Ticket size={14} /> Bilet Al
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sağ sidebar */}
      <RightSidebar />
    </div>
  );
}
