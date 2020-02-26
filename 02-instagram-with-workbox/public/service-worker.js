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

precacheAndRoute([{"revision":"0a27a4163254fc8fce870c8cc3a3f94f","url":"404.html"},{"revision":"2cab47d9e04d664d93c8d91aec59e812","url":"favicon.ico"},{"revision":"f71e687414bd1ac09966db581c40fce6","url":"index.html"},{"revision":"d11c7965f5cfba711c8e74afa6c703d7","url":"manifest.json"},{"revision":"69e0758940bbbedce20b5b965d335273","url":"offline.html"},{"revision":"0365427821b1ded81fc4682cfa5231ee","url":"src/css/app.css"},{"revision":"a2be62d1f39165871536049b697e28fd","url":"src/css/feed.css"},{"revision":"1c6d81b27c9d423bece9869b07a7bd73","url":"src/css/help.css"},{"revision":"9d68a73fc4223903bae2017170ed550c","url":"src/js/app.js"},{"revision":"923195750b97ef1cbee77095a4281b1f","url":"src/js/feed.js"},{"revision":"713af0c6ce93dbbce2f00bf0a98d0541","url":"src/js/material.min.js"},{"revision":"9ae352d9ec3d50c98ccf6a98b6f41d57","url":"src/js/polyfills/fetch.js"},{"revision":"4cf99bdf27ca95d01f29964b67d784e5","url":"src/js/polyfills/idb.js"},{"revision":"7827d768f2eb5140a34988b71440d4ae","url":"src/js/polyfills/promise.js"},{"revision":"ae09f64b08f20150c97500e70c4d1d4f","url":"src/js/utils/constants.js"},{"revision":"a8bb4aca60c44b4f4d8ef6aff7cba9ef","url":"src/js/utils/dbHelpers.js"},{"revision":"862816c3dd530933736d6265748f4048","url":"src/js/utils/httpHelpers.js"},{"revision":"9831edc8203dc07cae4eab114212080e","url":"src/js/utils/notificationHelpers.js"},{"revision":"745c8ed820250fe1c5d13a8fd943d28f","url":"src/js/utils/pwaHelpers.js"},{"revision":"6281e22db08f25e160317d91c980af68","url":"src/js/utils/swHelpers.js"},{"revision":"3103a7741894c5e5c1470659a83b62ed","url":"sw.js"},{"revision":"5c4e83beb603009a615531b3bf03bbdd","url":"workbox-f680761d.js"},{"revision":"31b19bffae4ea13ca0f2178ddb639403","url":"src/images/main-image-lg.jpg"},{"revision":"c6bb733c2f39c60e3c139f814d2d14bb","url":"src/images/main-image-sm.jpg"},{"revision":"5c66d091b0dc200e8e89e56c589821fb","url":"src/images/main-image.jpg"}]);

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
