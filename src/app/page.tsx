"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────

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
  hasSports?: {
    arsenal?: boolean;
    bucks?: boolean;
    packers?: boolean;
  };
}

// ─── Constants ───────────────────────────────────────────────────────

const SPORT_IDS = new Set(["arsenal", "bucks", "packers"]);

const SECTION_ORDER: Record<string, number> = {
  ai: 0,
  business: 1,
  science: 2,
  politics: 3,
  culture: 4,
  sports: 5,
  local: 6,
  arsenal: 100,
  bucks: 101,
  packers: 102,
};

const SECTION_NAV_LABELS: Record<string, string> = {
  ai: "AI & TECH",
  business: "MARKETS",
  science: "WORLD",
  politics: "US NEWS",
  culture: "CULTURE",
  sports: "SPORTS",
  local: "LOCAL",
  arsenal: "ARSENAL",
  bucks: "BUCKS",
  packers: "PACKERS",
};

const SECTION_ACCENT: Record<string, string> = {
  ai: "#2563eb",
  business: "#22c55e",
  science: "#f59e0b",
  politics: "#e63329",
  culture: "#a855f7",
  sports: "#f59e0b",
  local: "#666666",
  arsenal: "#e63329",
  bucks: "#22c55e",
  packers: "#22c55e",
};

// ─── Utilities ───────────────────────────────────────────────────────

function getVideoId(url: string): string | null {
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function isStale(dateStr: string): boolean {
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
  return { ms, display: `in ${hours}h ${minutes}m` };
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

// ─── Components ──────────────────────────────────────────────────────

function RatingDots({ count, color }: { count: number; color: string }) {
  return (
    <span className="inline-flex gap-[3px] items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{ color: i <= count ? color : "#ddd" }}
          className="text-[8px] leading-none"
        >
          &#x2B24;
        </span>
      ))}
    </span>
  );
}

function WorthBadge({ value }: { value: string }) {
  if (value === "YES") {
    return (
      <span className="inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30">
        WATCH
      </span>
    );
  }
  if (value === "MAYBE") {
    return (
      <span className="inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30">
        MAYBE
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-[#e5e5e5]/50 text-[#999] border border-[#e5e5e5]">
      SKIP
    </span>
  );
}

function TopStoryBadge() {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-[#e63329]/15 text-[#e63329] border border-[#e63329]/30 mr-2">
      TOP STORY
    </span>
  );
}

function ArticleRow({
  item,
  index,
  isFirst,
  accentColor,
  isExpanded,
  onToggle,
  isLargeHero,
}: {
  item: BriefingItem;
  index: number;
  isFirst: boolean;
  accentColor: string;
  isExpanded: boolean;
  onToggle: () => void;
  isLargeHero?: boolean;
}) {
  const headlineSize = isLargeHero ? "text-[22px]" : "text-[17px]";

  return (
    <div className={index > 0 ? "border-t border-[#e5e5e5] pt-4" : ""}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {isFirst && <TopStoryBadge />}
          <h3
            className={`${headlineSize} font-bold leading-snug text-[#111] cursor-pointer hover:text-black transition-colors`}
            onClick={onToggle}
          >
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="hover:underline"
              >
                {item.headline}
              </a>
            ) : (
              item.headline
            )}
          </h3>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[12px] text-[#666]">{item.source}</span>
            <RatingDots count={item.rating} color={accentColor} />
          </div>
          {isExpanded && (
            <p
              className={`mt-2 text-[14px] text-[#666] leading-relaxed article-summary ${
                isLargeHero ? "line-clamp-3" : "line-clamp-2"
              }`}
            >
              {item.summary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NewsSection({
  section,
  expandedItem,
  onToggleItem,
}: {
  section: BriefingSection;
  expandedItem: number | null;
  onToggleItem: (sectionId: string, itemIndex: number) => void;
}) {
  const accent = SECTION_ACCENT[section.id] || "#888";
  const label = SECTION_NAV_LABELS[section.id] || section.title.toUpperCase();
  const isSport = SPORT_IDS.has(section.id);

  return (
    <section id={`section-${section.id}`} className={`${isSport ? "pt-8" : "pt-12"}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-5 rounded-sm" style={{ background: accent }} />
        <h2
          className="text-[11px] font-bold uppercase tracking-[0.15em]"
          style={{ color: accent }}
        >
          {label}
        </h2>
      </div>

      {section.empty ? (
        <p className="text-[14px] text-[#999] italic">Nothing notable in the past 24h</p>
      ) : (
        <div className="space-y-4">
          {section.items.map((item, i) => (
            <ArticleRow
              key={i}
              item={item}
              index={i}
              isFirst={i === 0}
              accentColor={accent}
              isExpanded={expandedItem === i}
              onToggle={() => onToggleItem(section.id, i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AiSection({
  section,
  expandedItem,
  onToggleItem,
}: {
  section: BriefingSection;
  expandedItem: number | null;
  onToggleItem: (sectionId: string, itemIndex: number) => void;
}) {
  const accent = SECTION_ACCENT.ai;
  const mainStory = section.items[0];
  const secondaryStories = section.items.slice(1);

  return (
    <section id="section-ai" className="pt-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-5 rounded-sm" style={{ background: accent }} />
        <h2
          className="text-[11px] font-bold uppercase tracking-[0.15em]"
          style={{ color: accent }}
        >
          AI & TECH
        </h2>
      </div>

      {section.empty ? (
        <p className="text-[14px] text-[#999] italic">Nothing notable in the past 24h</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-8">
          {/* Main story */}
          <div>
            {mainStory && (
              <ArticleRow
                item={mainStory}
                index={0}
                isFirst={true}
                accentColor={accent}
                isExpanded={expandedItem === 0}
                onToggle={() => onToggleItem(section.id, 0)}
                isLargeHero
              />
            )}
          </div>
          {/* Secondary stories */}
          <div className="space-y-4 md:border-l md:border-[#e5e5e5] md:pl-6">
            {secondaryStories.map((item, i) => (
              <ArticleRow
                key={i + 1}
                item={item}
                index={i}
                isFirst={false}
                accentColor={accent}
                isExpanded={expandedItem === i + 1}
                onToggle={() => onToggleItem(section.id, i + 1)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function YouTubeSection({
  videos,
  expandedCard,
  onToggleCard,
}: {
  videos: YouTubeEntry[];
  expandedCard: number | null;
  onToggleCard: (index: number) => void;
}) {
  return (
    <section id="section-youtube" className="pt-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-5 rounded-sm bg-[#ff0000]" />
        <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#ff0000]">
          YOUTUBE
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 md:grid md:grid-cols-3 md:overflow-visible">
        {videos.map((video, i) => {
          const videoId = getVideoId(video.url);
          const thumb = videoId
            ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
            : null;
          const isExpanded = expandedCard === i;

          return (
            <div
              key={i}
              className="flex-shrink-0 w-[280px] md:w-auto cursor-pointer group"
              onClick={() => onToggleCard(i)}
            >
              {/* Thumbnail */}
              {thumb && (
                <div className="relative aspect-video rounded-md overflow-hidden bg-[#f8f8f8]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/80 text-[11px] text-white px-1.5 py-0.5 rounded font-mono">
                    {video.duration}
                  </div>
                </div>
              )}
              {/* Info */}
              <div className="mt-2.5">
                <h3 className="text-[14px] font-bold leading-snug text-[#111] line-clamp-2">
                  {video.title}
                </h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[12px] text-[#666]">{video.creator}</span>
                  <WorthBadge value={video.worthWatching} />
                </div>
                <div className="mt-1">
                  <RatingDots count={video.rating} color="#ff0000" />
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 space-y-3">
                    <p className="text-[13px] text-[#666] leading-relaxed">
                      {video.summary}
                    </p>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-block px-4 py-1.5 bg-[#ff0000] hover:bg-[#cc0000] text-white text-[12px] font-bold uppercase tracking-wider rounded-sm transition-colors"
                    >
                      Watch Now
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function Home() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, number | null>>({});
  const [expandedYouTube, setExpandedYouTube] = useState<number | null>(null);
  const [countdown, setCountdown] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");
  const navRef = useRef<HTMLDivElement>(null);

  const fetchBriefing = useCallback(async (showChecking = false) => {
    if (showChecking) setChecking(true);
    try {
      const res = await fetch("/api/briefing", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const briefing: BriefingData = await res.json();
      setData(briefing);
      setError(null);
    } catch {
      setError("Could not load briefing data");
    } finally {
      if (showChecking) setTimeout(() => setChecking(false), 2000);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  useEffect(() => {
    const { ms } = getTimeUntilNextRefresh();
    const refreshTimer = setTimeout(() => {
      window.location.reload();
    }, ms);

    const countdownInterval = setInterval(() => {
      const { display } = getTimeUntilNextRefresh();
      setCountdown(display);
    }, 60000);
    setCountdown(getTimeUntilNextRefresh().display);

    const pollInterval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      const min = now.getMinutes();
      if ((hour === 6 && min >= 30) || (hour === 7 && min <= 30)) {
        fetchBriefing(true);
      }
    }, 60000);

    return () => {
      clearTimeout(refreshTimer);
      clearInterval(countdownInterval);
      clearInterval(pollInterval);
    };
  }, [fetchBriefing]);

  // Scroll spy for active tab
  useEffect(() => {
    if (!data) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("section-", "");
            setActiveTab(id);
          }
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );

    const sections = document.querySelectorAll("[id^='section-']");
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [data]);

  const toggleItem = (sectionId: string, itemIndex: number) => {
    setExpandedItems((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] === itemIndex ? null : itemIndex,
    }));
  };

  const toggleYouTube = (index: number) => {
    setExpandedYouTube((prev) => (prev === index ? null : index));
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) {
      const offset = 120;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[#e63329] text-[15px]">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-1.5 h-1.5 rounded-full bg-[#e63329] animate-pulse-live mr-2" />
          <span className="text-[#666] text-[14px] uppercase tracking-widest">Loading briefing</span>
        </div>
      </div>
    );
  }

  const stale = isStale(data.generatedAt);

  // Sort sections by defined order
  const sortedSections = [...data.sections].sort(
    (a, b) => (SECTION_ORDER[a.id] ?? 50) - (SECTION_ORDER[b.id] ?? 50)
  );

  // Determine which sports sections exist and have content
  const hasSports = data.hasSports || {};
  const sportSections = sortedSections.filter(
    (s) => SPORT_IDS.has(s.id) && !s.empty
  );
  const newsSections = sortedSections.filter((s) => !SPORT_IDS.has(s.id) && !s.empty);
  const anySports = sportSections.length > 0 || Object.values(hasSports).some(Boolean);

  // Build nav tabs
  const navTabs: { id: string; label: string }[] = [];
  for (const s of newsSections) {
    if (s.id === "local" && s.empty) continue;
    navTabs.push({ id: s.id, label: SECTION_NAV_LABELS[s.id] || s.title.toUpperCase() });
  }
  // Add YouTube tab
  if (data.youtube && data.youtube.length > 0) {
    navTabs.push({ id: "youtube", label: "YOUTUBE" });
  }
  // Add sport tabs only if they have content
  for (const s of sportSections) {
    navTabs.push({ id: s.id, label: SECTION_NAV_LABELS[s.id] || s.title.toUpperCase() });
  }
  // Also add sport tabs from hasSports if section doesn't exist in data but is flagged true
  for (const [key, val] of Object.entries(hasSports)) {
    if (val && !sportSections.find((s) => s.id === key) && !navTabs.find((t) => t.id === key)) {
      navTabs.push({ id: key, label: SECTION_NAV_LABELS[key] || key.toUpperCase() });
    }
  }

  // Sections to render (non-sport, non-empty, excluding "local" if empty)
  const renderSections = sortedSections.filter((s) => {
    if (SPORT_IDS.has(s.id)) return false;
    if (s.empty && s.id === "local") return false;
    return true;
  });

  return (
    <>
      {/* ─── Sticky Header ─── */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e5e5]">
        <div className="max-w-[1100px] mx-auto px-4 h-12 flex items-center justify-between">
          {/* Left: wordmark */}
          <div className="flex items-center gap-2">
            <span className="text-[#e63329] text-[10px]">&#x25CF;</span>
            <span className="text-[14px] font-bold tracking-[0.15em] text-black">
              BRIEFING
            </span>
          </div>

          {/* Center: date */}
          <div className="hidden sm:block text-[11px] font-bold uppercase tracking-[0.15em] text-[#666]">
            {formatDateHeader(data.generatedAt)}
          </div>

          {/* Right: live badge + timestamp */}
          <div className="flex items-center gap-3">
            {checking && (
              <span className="text-[11px] text-[#666] uppercase tracking-widest animate-flash-check">
                Checking for updates...
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse-live" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#22c55e]">
                LIVE
              </span>
            </div>
            <span className="text-[11px] text-[#666]">
              Updated {formatTime(data.generatedAt)}
            </span>
          </div>
        </div>
        {/* Red accent line */}
        <div className="h-[2px] bg-[#e63329]" />
      </header>

      {/* ─── Nav Tabs ─── */}
      <nav className="sticky top-[50px] z-40 bg-[#f8f8f8] border-b border-[#e5e5e5]">
        <div
          ref={navRef}
          className="max-w-[1100px] mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar py-2"
        >
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => scrollToSection(tab.id)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
                activeTab === tab.id
                  ? "bg-[#111] text-white"
                  : "text-[#666] hover:text-black"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ─── Stale Data Warning ─── */}
      {stale && (
        <div className="bg-[#f59e0b]/10 border-b border-[#f59e0b]/30">
          <div className="max-w-[1100px] mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-[13px] text-[#f59e0b]">
            <span className="font-bold">&#x26A0; Yesterday&apos;s briefing</span>
            <span className="text-[#f59e0b]/70">
              Next update at 6:30 AM &middot; refreshing automatically {countdown}
            </span>
          </div>
        </div>
      )}

      {/* ─── Main Content ─── */}
      <main className="max-w-[1100px] mx-auto px-4 pb-20">
        {/* Render sections */}
        {renderSections.map((section) =>
          section.id === "ai" ? (
            <AiSection
              key={section.id}
              section={section}
              expandedItem={expandedItems[section.id] ?? null}
              onToggleItem={toggleItem}
            />
          ) : (
            <NewsSection
              key={section.id}
              section={section}
              expandedItem={expandedItems[section.id] ?? null}
              onToggleItem={toggleItem}
            />
          )
        )}

        {/* YouTube */}
        {data.youtube && data.youtube.length > 0 && (
          <YouTubeSection
            videos={data.youtube}
            expandedCard={expandedYouTube}
            onToggleCard={toggleYouTube}
          />
        )}

        {/* Sports sections — at the bottom, smaller weight */}
        {anySports && sportSections.length > 0 && (
          <div className="mt-16 pt-8 border-t border-[#e5e5e5]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {sportSections.map((section) => (
                <NewsSection
                  key={section.id}
                  section={section}
                  expandedItem={expandedItems[section.id] ?? null}
                  onToggleItem={toggleItem}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
