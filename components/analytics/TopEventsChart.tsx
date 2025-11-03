"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TopEventsChartProps {
  events: {
    id: string;
    title: string;
    ticketCount: number;
  }[];
}

export default function TopEventsChart({ events }: TopEventsChartProps) {
  const router = useRouter();
  const chartRef = useRef<any>(null);
  const [isDark, setIsDark] = useState(false);

  // Dark mode detection
  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== "undefined") {
        setIsDark(document.documentElement.classList.contains("dark"));
      }
    };

    checkDarkMode();

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    if (typeof window !== "undefined") {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    return () => observer.disconnect();
  }, []);

  const sortedEvents = [...events]
    .sort((a, b) => b.ticketCount - a.ticketCount)
    .slice(0, 5); // En çok 5 tanesini göster

  if (sortedEvents.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-sm p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          En Çok Katılım Alan Etkinlikler
        </h3>
        <div className="h-[2px] w-20 bg-[#ff7b00] rounded-full mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Henüz etkinlik verisi bulunmuyor.
        </p>
      </div>
    );
  }

  const data = {
    labels: sortedEvents.map((e) => e.title),
    datasets: [
      {
        label: "Bilet Sayısı",
        data: sortedEvents.map((e) => e.ticketCount),
        backgroundColor: "#ff7b00",
        hoverBackgroundColor: "#ff9d33",
        borderRadius: 10,
        barThickness: 35,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const, // YATAY grafik (Spotify tarzı)
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: "easeInOutQuart" as const,
    },
    interaction: {
      mode: "nearest" as const,
      intersect: true,
    },
    onHover: (event: any, activeElements: any[]) => {
      if (event.native) {
        event.native.target.style.cursor = activeElements.length > 0 ? "pointer" : "default";
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.95)",
        titleColor: isDark ? "#fff" : "#1f1f1f",
        bodyColor: "#ff7b00",
        borderColor: "#ff7b00",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            return `${context.parsed.x} bilet satıldı`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          color: isDark ? "#aaa" : "#666",
          font: {
            size: 11,
          },
          stepSize: 1,
          callback: (value: any) => `${value} bilet`,
        },
        grid: {
          color: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
        },
      },
      y: {
        ticks: {
          color: isDark ? "#fff" : "#1f1f1f",
          font: {
            size: 12,
            weight: "500" as const,
          },
        },
        grid: {
          display: false,
        },
      },
    },
    onClick: (event: any, activeElements: any[]) => {
      if (!chartRef.current || activeElements.length === 0) return;
      
      const chart = chartRef.current;
      const clickedIndex = activeElements[0].index;
      const clickedEvent = sortedEvents[clickedIndex];
      
      if (clickedEvent?.id) {
        // 🎯 Yönlendirme - yumuşak geçiş ile
        router.push(`/events/${clickedEvent.id}`);
      }
    },
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-sm p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        En Çok Katılım Alan Etkinlikler
      </h3>
      <div className="h-[2px] w-20 bg-[#ff7b00] rounded-full mb-6" />
      <div className="h-64">
        <Bar ref={chartRef} data={data} options={options} />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        Top {sortedEvents.length} etkinlik — toplam {sortedEvents.reduce((sum, e) => sum + e.ticketCount, 0)} bilet satışı
      </p>
    </div>
  );
}
