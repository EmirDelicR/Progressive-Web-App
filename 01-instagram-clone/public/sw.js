importScripts('/src/js/utils/constants.js');
importScripts('/src/js/utils/swHelpers.js');
importScripts('/src/js/polyfills/idb.js');
importScripts('/src/js/utils/dbHelpers.js');

/** SW INSTALL */
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker ...', event);

  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then(cache => {
      console.log('[Service Worker] Pre caching App');
      cache.addAll(STATIC_FILES);
    })
  );
});
/** SW ACTIVE */
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker ...', event);
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

/** SW REQUEST FETCH */
self.addEventListener('fetch', event => {
  const url = 'https://pwagram-76764.firebaseio.com/posts.json';

  if (event.request.url.indexOf(url) > -1) {
    // This is normal first cache then network
    event.respondWith(
      fetch(event.request).then(res => {
        // store response in db
        const clonedRes = res.clone();
        clearAllData('posts')
          .then(() => {
            return clonedRes.json();
          })
          .then(data => {
            for (let key in data) {
              // function from dbHelpers.js
              writeDate('posts', data[key]);
            }
          });
        return res;
      })
    );
    // Adding cache only - can be removed later
  } else if (isUrlInArray(event.request.url, STATIC_FILES)) {
    event.respondWith(caches.match(event.request));
  } else {
    event.respondWith(
      // Use old cache then network fallback
      caches.match(event.request).then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(res => {
            return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
              // trimCache(CACHE_DYNAMIC_NAME, 3);
              cache.put(event.request.url, res.clone());
              return res;
            });
          })
          .catch(err => {
            return caches.open(CACHE_STATIC_NAME).then(cache => {
              if (event.request.headers.get('accept').includes('text/html')) {
                return cache.match('/offline.html');
              }
            });
          });
      })
    );
  }
});

/** SW BACKGROUND SYNC */
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background Sync: ', event);

  if (event.tag === 'sync-new-posts') {
    console.log('[SW] Syncing new post');
    event.waitUntil(
      readAllData('sync-posts').then(async data => {
        for (let item of data) {
          const postData = createFormData(item);
          const data = await makeApiCall('posts', 'POST', postData);
          deleteItemFromData('sync-posts', data.id);
        }
      })
    );
  }
});

/** PUSH NOTIFICATION (display notification) */
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action = event.action;

  if (action === 'confirm') {
    notification.close();
    return;
  }
  /** Open new page */
  event.waitUntil(
    clients.matchAll().then(matchedClients => {
      const client = matchedClients.find(c => {
        /** This means that window is open */
        return c.visibilityState === 'visible';
      });

      if (client !== undefined) {
        client.navigate(notification.data.url);
        client.focus();
      } else {
        clients.openWindow(notification.data.url);
      }
      notification.close();
    })
  );
});

self.addEventListener('push', event => {
  console.log('Push notification received: ', event);

  let data = {
    title: 'New!',
    content: 'Something new happen!',
    openUrl: '/'
  };

  if (event.data) {
    data = JSON.parse(event.data.text());
  }

  const options = {
    body: data.content,
    icon: '/src/images/icons/app-icon-48x48.png',
    badge: '/src/images/icons/app-icon-96x96.png',
    data: {
      url: data.openUrl
    }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});
