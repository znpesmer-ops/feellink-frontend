import dynamic from "next/dynamic";

const EventsFeedClient = dynamic(
  () => import("./EventsFeedClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        Yükleniyor...
      </div>
    ),
  }
);

export default function EventsPage() {
  return <EventsFeedClient />;
}
