"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Bu sayfa artık /events sayfasına yönlendiriyor
// Tüm etkinlik işlemleri /events sayfasında yapılıyor
export default function MyEventsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // /events sayfasına yönlendir ve "Etkinliklerim" sekmesini aktif et
    router.replace('/events?tab=mine');
  }, [router]);
  
  return null;
}
