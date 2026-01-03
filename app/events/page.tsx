"use client";

import { Suspense } from "react";
import EventsFeedClient from "./EventsFeedClient";

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Yükleniyor...
        </div>
      }
    >
      <EventsFeedClient />
    </Suspense>
  );
}
