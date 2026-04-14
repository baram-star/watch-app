self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('message', async (event) => {
  if (event.data?.type === 'SHOW_REMINDER') {
    await self.registration.showNotification('WATCH 루틴 알림', {
      body: event.data.body || '오늘의 WATCH를 기록할 시간이에요!',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'watch-daily-reminder',
      renotify: true,
    });
  }
});
