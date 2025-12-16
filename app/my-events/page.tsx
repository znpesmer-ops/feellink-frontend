"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Bu sayfa artık /events sayfasına yönlendiriyor
// Tüm etkinlik işlemleri /events sayfasında yapılıyor
export default function MyEventsRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // /events sayfasına yönlendir ve "Etkinliklerim" sekmesini aktif et
    router.replace('/events?tab=mine');
  }, [router]);
  
  return null;
}

// Dynamic export - prerender'i devre dışı bırak
export const dynamic = 'force-dynamic';
