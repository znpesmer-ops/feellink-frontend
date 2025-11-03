"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useEffect, useState } from "react";
import { initSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/store";

// Register Chart.js components
ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

interface TicketChartProps {
  eventId: string;
  initialTicketCount?: number;
}

export default function TicketChart({ eventId, initialTicketCount = 0 }: TicketChartProps) {
  const { accessToken } = useAuthStore();
  const [dataPoints, setDataPoints] = useState<number[]>([initialTicketCount]);
  const [labels, setLabels] = useState<string[]>([
    new Date().toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  ]);
  const [currentCount, setCurrentCount] = useState<number>(initialTicketCount);

  // 📡 Gerçek zamanlı socket bağlantısı
  useEffect(() => {
    if (!accessToken) return;

    const socket = initSocket(accessToken);

    const handler = (ticketData: any) => {
      setCurrentCount((prevCount) => {
        const newCount = ticketData.ticketCount || prevCount + 1;
        
        setDataPoints((prevPoints) => {
          // Son 50 veri noktasını tut (performans için)
          const newPoints = [...prevPoints, newCount];
          return newPoints.slice(-50);
        });
        setLabels((prevLabels) => {
          const newLabel = new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const newLabels = [...prevLabels, newLabel];
          return newLabels.slice(-50);
        });
        
        return newCount;
      });
    };

    socket.on(`ticket_update:${eventId}`, handler);

    return () => {
      socket.off(`ticket_update:${eventId}`, handler);
    };
  }, [eventId, accessToken]);

  // Initial count güncellendiğinde grafiği güncelle (sadece ilk yüklemede)
  useEffect(() => {
    if (dataPoints.length === 1 && initialTicketCount !== dataPoints[0]) {
      setCurrentCount(initialTicketCount);
      setDataPoints([initialTicketCount]);
    }
  }, [initialTicketCount]);

  // Dark mode detection
  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const data = {
    labels,
    datasets: [
      {
        label: "Satılan Bilet Sayısı",
        data: dataPoints,
        borderColor: "#ff7b00",
        backgroundColor: "rgba(255, 123, 0, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#ff7b00",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: "easeInOutQuart" as const,
    },
    plugins: {
      legend: {
        display: true,
        labels: {
          color: isDark ? "#ccc" : "#666",
          font: {
            size: 12,
            weight: "500" as const,
          },
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.95)",
        titleColor: isDark ? "#fff" : "#1f1f1f",
        bodyColor: isDark ? "#ccc" : "#666",
        borderColor: "#ff7b00",
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y} bilet`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDark ? "#aaa" : "#666",
          font: {
            size: 10,
          },
          maxRotation: 45,
          minRotation: 0,
        },
        grid: {
          color: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: isDark ? "#aaa" : "#666",
          font: {
            size: 10,
          },
          stepSize: 1,
          callback: (value: any) => `${value} bilet`,
        },
        grid: {
          color: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-sm p-6 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-[#ff7b00] animate-pulse"></div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Canlı Bilet Satış Grafiği
        </h3>
      </div>
      <div className="h-64">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
