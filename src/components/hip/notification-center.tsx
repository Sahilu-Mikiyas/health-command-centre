import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";

import {
  detailForEvent,
  isForRoles,
  notificationFeedQuery,
  routeForEvent,
  titleForEvent,
} from "@/lib/hip/alerts";
import { myProfileQuery } from "@/lib/hip/queries";

const SEEN_KEY = "hip:alerts:last-seen";

const toneClass: Record<string, string> = {
  critical: "bg-[#FDE8E7] text-[#D70015] border-[#F9BDBD]",
  warning: "bg-[#FFF4E5] text-[#B86200] border-[#FFE0B2]",
  info: "bg-[#F5F5F7] text-black border-black/10",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Role-aware notification bell: shows only what this role must act on. */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const { data: me } = useQuery(myProfileQuery);
  const feed = useQuery({ ...notificationFeedQuery, refetchInterval: 20000 });

  useEffect(() => {
    try {
      setLastSeen(Number(window.localStorage.getItem(SEEN_KEY) ?? 0));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const mine = (feed.data ?? []).filter((event) => isForRoles(event.event_type, me?.roles)).slice(0, 25);
  const unread = mine.filter((event) => new Date(event.occurred_at).getTime() > lastSeen).length;

  const markRead = () => {
    const now = Date.now();
    setLastSeen(now);
    try {
      window.localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) markRead();
        }}
        aria-label="Notifications"
        className="relative grid size-9 place-items-center rounded-2xl border border-black/5 bg-[#F5F5F7] text-black transition-colors hover:bg-black hover:text-white cursor-pointer"
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[#D70015] px-1 text-[9px] font-black text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
              <div>
                <p className="text-xs font-extrabold text-black">Live Notifications</p>
                <p className="text-[10px] font-semibold text-[#86868B]">Filtered to your role · realtime</p>
              </div>
              <button
                type="button"
                onClick={markRead}
                className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-[#F5F5F7] px-2 py-1 text-[10px] font-bold text-black hover:bg-black hover:text-white cursor-pointer"
              >
                <CheckCheck className="size-3" /> Mark read
              </button>
            </div>

            <ul className="max-h-[24rem] divide-y divide-black/5 overflow-y-auto">
              {mine.map((event) => (
                <li key={event.id}>
                  <Link
                    to={routeForEvent(event.event_type)}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 transition-colors hover:bg-[#F5F5F7]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-extrabold text-black">{titleForEvent(event)}</p>
                      <span className="numeric shrink-0 text-[10px] font-semibold text-[#86868B]">
                        {timeAgo(event.occurred_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold text-[#86868B]">
                      {detailForEvent(event) || event.event_type}
                    </p>
                    <span
                      className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${
                        toneClass[event.severity] ?? toneClass["info"]
                      }`}
                    >
                      {event.severity}
                    </span>
                  </Link>
                </li>
              ))}
              {mine.length === 0 ? (
                <li className="px-4 py-8 text-center text-[11px] font-semibold text-[#86868B]">
                  No notifications for your role yet.
                </li>
              ) : null}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
