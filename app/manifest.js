export default function manifest() {
  return {
    name: "WATCH - 생활습관 루틴",
    short_name: "WATCH",
    description: "WATCH 생활습관 루틴 앱 - 수면, 학습, 독서, 놀이, 성찰",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0D9488",
    orientation: "portrait",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
