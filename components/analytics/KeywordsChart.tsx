"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Label,
} from "recharts";

interface KeywordsChartProps {
  data: Array<{ word: string; count: number }>;
}

export default function KeywordsChart({ data }: KeywordsChartProps) {
  const [isDark, setIsDark] = useState(false);

  // Dark mode detection
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(
        typeof window !== "undefined" &&
          document.documentElement.classList.contains("dark")
      );
    };

    checkDarkMode();
    
    // Dark mode değişikliklerini dinle
    const observer = new MutationObserver(checkDarkMode);
    if (typeof window !== "undefined") {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    return () => observer.disconnect();
  }, []);

  // data formatı: [{ word: "sanat", count: 14 }, ...]
  // Recharts için uygun formata dönüştür
  // En yüksek değer en üstte görünsün diye reverse ediyoruz
  const chartData = data
    .slice(0, 15)
    .map((item) => ({
      name: item.word,
      value: item.count,
    }))
    .reverse(); // En yüksek değer en üstte olacak

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[380px] text-gray-500 dark:text-gray-400">
        Henüz kelime verisi bulunmuyor
      </div>
    );
  }

  const textColor = isDark ? "#9ca3af" : "#6b7280";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  const tooltipBg = isDark ? "#1a1a1a" : "#ffffff";
  const tooltipBorder = "#FF8A00"; // Turuncu border

  return (
    <div style={{ width: "100%", height: "380px" }}>
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          layout="vertical" // YATAY grafik için zorunlu
          margin={{ top: 20, right: 30, left: 0, bottom: 20 }} // 🔥 SOL MARGIN 0 → grafik tam kartın solundan başlar
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke={borderColor} />
          
          {/* Y ekseni: Kelimeler */}
          <YAxis 
            dataKey="name" 
            type="category" 
            width={120}
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={{ stroke: borderColor }}
          />

          {/* X ekseni: Kullanım Sayısı */}
          <XAxis 
            type="number"
            domain={[0, 'dataMax']} // Solu 0'a sabitler → çizgi tam soldan başlar
            allowDecimals={false} // Tam sayılar göster
            padding={{ right: 20 }} // Çizginin sağdan yapışmasını engeller
            tick={{ fill: textColor, fontSize: 11 }}
            axisLine={{ stroke: borderColor }}
          >
            <Label 
              value="Kullanım Sıklığı" 
              offset={-5} 
              position="insideBottom"
              style={{ fill: textColor, fontSize: 11 }}
            />
          </XAxis>

          <Tooltip 
            formatter={(value: number) => [`${value} kez`, "Kullanım"]}
            labelFormatter={(label: string) => `Kelime: ${label}`}
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: "8px",
              color: isDark ? "#fff" : "#000",
            }}
            labelStyle={{
              color: isDark ? "#fff" : "#000",
              fontWeight: "bold",
            }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#1E88E5"
            strokeWidth={3}
            dot={{ r: 5, fill: "#FF8A00" }}
            activeDot={{ r: 8, fill: "#FF8A00" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

