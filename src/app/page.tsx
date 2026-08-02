import { ChatPanel } from "@/components/ChatPanel";
import { getIndexStats } from "@/lib/rag/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let stats = {
    count: 0,
    newestLastSeen: null as number | null,
    ingestHint: "Run `npm run ingest` locally to scrape and index jobs.",
  };

  try {
    stats = { ...stats, ...(await getIndexStats()) };
  } catch {
    // Empty index is fine on first boot.
  }

  return <ChatPanel initialStats={stats} />;
}
