"use client";
import { useEffect } from "react";

export default function SWProvider() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // Check reminder
    const enabled = localStorage.getItem("watch_notif_enabled") === "true";
    const time = localStorage.getItem("watch_notif_time") || "20:00";
    if (!enabled) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const [h, m] = time.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    const diff = now - target;
    // If within 1 hour after reminder time and not notified today
    if (diff >= 0 && diff < 60 * 60 * 1000) {
      const lastKey = "watch_notif_last_" + now.toISOString().split("T")[0];
      if (!localStorage.getItem(lastKey)) {
        localStorage.setItem(lastKey, "1");
        navigator.serviceWorker.ready.then(reg => {
          reg.active?.postMessage({ type: "SHOW_REMINDER", body: "오늘의 WATCH를 기록할 시간이에요!" });
        });
      }
    }
  }, []);
  return null;
}
