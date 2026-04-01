"use client";

import { useState, useEffect, useCallback } from "react";

interface BriefingItem {
  headline: string;
  summary: string;
  source: string;
  rating: number;
  url?: string;
}

interface BriefingSection {
  id: string;
  emoji: string;
  title: string;
  items: BriefingItem[];
  empty: boolean;
}

interface YouTubeEntry {
  title: string;
  creator: string;
  url: string;
  duration: string;
  rating: number;
  summary: string;
  worthWatching: string;
}

interface BriefingData {
  generatedAt: string;
  date: string;
  sections: BriefingSection[];
  youtube: YouTubeEntry[];
}

function getVideoId(url: string): string | null {
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function isYesterday(dateStr: string): boolean {
  const generated = new Date(dateStr);
  const now = new Date();
  return generated.toDateString() !== now.toDateString();
}

function getTimeUntilNextRefresh(): { ms: number; display: string } {
  const now = new Date();
  const next = new Date(now);
  next.setHours(6, 31, 0, 0);
  if (now >= next) {
    next.setDate(next.getDate() + 1);
  }
  const ms = next.getTime() - now.getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return { ms, display: `${hours}h ${minutes}m` };
}

function Stars({ count }: { count: number }) {
  return <span className="text-yellow-400">{"⭐".repeat(count)}</span>;
}

function WorthWatchingBadge({ value }: { value: string }) {
  if (value === "YES") {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-sm font-semibold bg-green-900 text-green-300">
        ✅ WATCH IT
      </span>
    );
  }
  if (value === "MAYBE") {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-sm font-semibold bg-yellow-900 text-yellow-300">
        🤔 MAYBE
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded text-sm font-semibold bg-gray-700 text-gray-400">
      ⏭ SKIP
    </span>
  );
}

function SectionCard({
  section,
  expanded,
  onToggle,
}: {
  section: BriefingSection;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#222] transition-colors"
      >
        <h2 className="text-lg font-semibold">
          {section.emoji} {section.title}
        </h2>
        <span className="text-muted text-xl">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {section.empty ? (
            <p className="text-muted italic">
              Nothing notable in the past 24h
            </p>
          ) : (
            section.items.map((item, i) => (
              <div key={i} className="border-t border-card-border pt-3">
                <h3 className="text-base font-bold leading-snug">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {item.headline}
                    </a>
                  ) : (
                    item.headline
                  )}
                </h3>
                <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                  {item.summary}
                </p>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span className="text-muted">{item.source}</span>
                  <Stars count={item.rating} />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function YouTubeCard({ video }: { video: YouTubeEntry }) {
  const videoId = getVideoId(video.url);
  const thumbnail = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null;

  return (
    <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {thumbnail && (
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:w-48 flex-shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt={video.title}
              className="w-full sm:w-48 h-auto object-cover"
            />
          </a>
        )}
        <div className="p-4 flex-1 min-w-0">
          <h3 className="font-bold text-base leading-snug">{video.title}</h3>
          <p className="text-muted text-sm mt-0.5">
            {video.creator} · {video.duration}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Stars count={video.rating} />
            <WorthWatchingBadge value={video.worthWatching} />
          </div>
          <p className="text-sm text-gray-300 mt-2 leading-relaxed line-clamp-4">
            {video.summary}
          </p>
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded transition-colors"
          >
            ▶ Watch
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [countdown, setCountdown] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch("/api/briefing", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const briefing: BriefingData = await res.json();
      setData(briefing);
      setExpandedSections(new Set(briefing.sections.map((s) => s.id)));
      setError(null);
    } catch {
      setError("Could not load briefing data");
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  // Auto-refresh at 6:31am and polling after 6:30am
  useEffect(() => {
    const { ms } = getTimeUntilNextRefresh();
    const refreshTimer = setTimeout(() => {
      window.location.reload();
    }, ms);

    // Update countdown every minute
    const countdownInterval = setInterval(() => {
      const { display } = getTimeUntilNextRefresh();
      setCountdown(display);
    }, 60000);
    // Set initial countdown
    setCountdown(getTimeUntilNextRefresh().display);

    // Poll every 60 seconds after 6:30am to catch new data
    const pollInterval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      const min = now.getMinutes();
      if ((hour === 6 && min >= 30) || (hour === 7 && min <= 30)) {
        fetchBriefing();
      }
    }, 60000);

    return () => {
      clearTimeout(refreshTimer);
      clearInterval(countdownInterval);
      clearInterval(pollInterval);
    };
  }, [fetchBriefing]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (error) {
    return (
      <main className="max-w-[800px] mx-auto px-4 py-8">
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="max-w-[800px] mx-auto px-4 py-8">
        <p className="text-muted">Loading briefing...</p>
      </main>
    );
  }

  const stale = isYesterday(data.generatedAt);

  return (
    <main className="max-w-[800px] mx-auto px-4 py-6 pb-16">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">📋 Daily Briefing</h1>
        <p className="text-muted text-sm mt-1">{data.date}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted">
          <span>Last updated: {timeAgo(data.generatedAt)}</span>
          <span>🔄 Refreshing at 6:31am</span>
          {countdown && <span>Next update in {countdown}</span>}
        </div>
        {stale && (
          <div className="mt-3 px-3 py-2 bg-yellow-900/50 border border-yellow-700 rounded text-yellow-300 text-sm">
            ⚠️ Yesterday&apos;s briefing — refreshing soon
          </div>
        )}
      </header>

      {/* Sections */}
      <div className="space-y-4">
        {data.sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            expanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>

      {/* YouTube Section */}
      {data.youtube && data.youtube.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">📺 YouTube Picks</h2>
          <div className="space-y-4">
            {data.youtube.map((video, i) => (
              <YouTubeCard key={i} video={video} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
