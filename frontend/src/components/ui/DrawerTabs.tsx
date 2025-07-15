import React, { useRef, useState, useEffect } from "react";

interface DrawerTab {
  id: string;
  label: string;
}

interface DrawerTabsProps {
  tabs: DrawerTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  vertical?: boolean;
}

export default function DrawerTabs({ tabs, activeTab, onTabChange, className = "", vertical = false }: DrawerTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Check scroll position to show/hide arrows
  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [tabs.length]);

  // Scroll the active tab into view when it changes
  useEffect(() => {
    const idx = tabs.findIndex(tab => tab.id === activeTab);
    const tabBtn = tabRefs.current[idx];
    if (tabBtn) {
      tabBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeTab, tabs]);

  const scrollBy = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className={`relative flex ${vertical ? "flex-col items-stretch" : "items-center"} ${className}`}>
      {/* Left Arrow (only for horizontal) */}
      {!vertical && (
        <button
          type="button"
          aria-label="Scroll tabs left"
          className={`absolute left-0 z-10 h-full px-1 flex items-center bg-gradient-to-r from-white via-white/80 to-transparent transition-opacity ${canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onClick={() => scrollBy(-100)}
          tabIndex={canScrollLeft ? 0 : -1}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M12.5 15l-5-5 5-5" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
      {/* Tab Bar */}
      <div
        ref={scrollRef}
        className={`flex ${vertical ? "flex-col overflow-y-auto h-full" : "overflow-x-auto whitespace-nowrap scrollbar-hide w-full"}`}
        style={{ scrollBehavior: "smooth" }}
      >
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            ref={el => { tabRefs.current[idx] = el; }}
            className={`flex-shrink-0 ${vertical ? "w-full text-left px-6 py-4 border-l-4" : "px-4 py-2 -mb-px"} font-medium text-sm focus:outline-none transition-colors duration-200
              ${activeTab === tab.id
                ? vertical
                  ? "text-primary border-primary bg-white" // active vertical
                  : "text-primary border-b-2 border-primary" // active horizontal
                : vertical
                  ? "text-gray-500 hover:text-primary border-transparent bg-gray-50 hover:bg-white" // inactive vertical
                  : "text-gray-500 hover:text-primary border-b-2 border-transparent" // inactive horizontal
              }
            `}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Right Arrow (only for horizontal) */}
      {!vertical && (
        <button
          type="button"
          aria-label="Scroll tabs right"
          className={`absolute right-0 z-10 h-full px-1 flex items-center bg-gradient-to-l from-white via-white/80 to-transparent transition-opacity ${canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onClick={() => scrollBy(100)}
          tabIndex={canScrollRight ? 0 : -1}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M7.5 5l5 5-5 5" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
    </div>
  );
} 