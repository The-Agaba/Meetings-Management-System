const CACHE='bmc-react-v2';const ASSETS=['/','/index.html','/rsvp.html','/attendance.html','/register.html','/manifest.json','/offline.html'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>undefined)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.pathname.startsWith('/api/'))return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).catch(()=>caches.match('/offline.html').then(page=>page||new Response('Offline',{status:503,headers:{'Content-Type':'text/plain'}})))));
});
