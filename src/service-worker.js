self.addEventListener('push', function (event) {
  const data = event.data?.json() || {};
  const title = data.title || 'Notificación';
  const options = {
    body: data.body || '',
    icon: '/assets/icons/icon-512x512.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});