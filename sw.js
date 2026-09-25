'use strict';

const VERSION='2.7.1';
const CACHE=`cutcalc-cnc-${VERSION}`;
const APP_SHELL=[
  './','./index.html','./styles.css','./machine-config.js','./calc-core.js','./app.js','./manifest.webmanifest',
  './icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png',
  './assets/result-rod.webp','./assets/rod-steel.webp','./assets/rod-brass.webp'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith('cutcalc-cnc-')&&key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

async function cacheFirst(request,fallback){
  const cached=await caches.match(request,{ignoreSearch:true});
  if(cached)return cached;
  try{
    const response=await fetch(request);
    if(response&&response.ok){
      const cache=await caches.open(CACHE);
      await cache.put(request,response.clone());
    }
    return response;
  }catch(error){
    if(fallback){
      const local=await caches.match(fallback,{ignoreSearch:true});
      if(local)return local;
    }
    throw error;
  }
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){event.respondWith(cacheFirst(request,'./index.html'));return}
  event.respondWith(cacheFirst(request));
});