importScripts('/src/js/utils/constants.js');
importScripts('/src/js/utils/swHelpers.js');
importScripts('/src/js/polyfills/idb.js');
importScripts('/src/js/utils/dbHelpers.js');

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

self.__WB_DISABLE_DEV_LOGS = true;

registerRoute(
  new RegExp('.*(?:googleapis|gstatic).com.*$'),
  new StaleWhileRevalidate({
    cacheName: 'google-fonts',
    cacheExpiration: {
      maxEntries: 3,
      maxAgeSecondes: 60 * 60 * 24 * 30
    }
  })
);

registerRoute(
  new RegExp('.*(?:firebasestorage.googleapis).com.*$'),
  new StaleWhileRevalidate({
    cacheName: 'post-images',
    cacheExpiration: {
      maxEntries: 10,
      maxAgeSecondes: 60 * 60 * 24
    }
  })
);

registerRoute(
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css',
  new StaleWhileRevalidate({
    cacheName: 'material-css'
  })
);

/** store data in indexedDB */
registerRoute('https://pwagram-76764.firebaseio.com/posts.json', args => {
  return fetch(args.event.request).then(res => {
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
  });
});

/** Make offline fallback */
const match = ({ url, event }) => {
  return event.request.headers.get('accept').includes('text/html');
};

const handler = ({ url, event, params }) => {
  return caches.match(event.request, { ignoreSearch: true }).then(response => {
    if (response) {
      return response;
    }

    return fetch(event.request)
      .then(res => {
        return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
          cache.put(event.request.url, res.clone());
          return res;
        });
      })
      .catch(err => {
        return caches
          .match('/offline.html', { ignoreSearch: true })
          .then(res => res);
      });
  });
};

registerRoute(match, handler);

precacheAndRoute(self.__WB_MANIFEST);

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
