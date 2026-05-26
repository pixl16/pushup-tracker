// This script runs in the background to handle app functionality
self.addEventListener('install', (e) => {
  console.log('PWA Service Worker Installed');
});

self.addEventListener('fetch', (e) => {
  // Keeps the app stable during network requests
});
