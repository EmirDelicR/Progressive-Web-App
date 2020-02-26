# Progressive-Web-App

PWA

[PWA Documentation](https://infrequently.org/2016/09/what-exactly-makes-something-a-progressive-web-app/)

## content

[Manifest](#manifest) <br/>
[Service Workers](#service-workers) <br/>
[Caching](#caching)<br/>
[Advanced Caching](#advance)<br/>
[Firebase](#firebase)<br/>
[Background Sync](#sync)<br/>
[Push Notifications](#notifications)<br/>
[Native Device](#native)

## manifest

[Manifest Generator](https://app-manifest.firebaseapp.com/)

[Manifest Doc](https://developers.google.com/web/fundamentals/web-app-manifest/)

[App Install Banner](https://developers.google.com/web/fundamentals/app-install-banners/)

```html
<!-- Add this to index.html file  -->
<link rel="manifest" href="PATH/TO/manifest.json" />
```

manifest.json

```json
{
  "name": "Some long name",
  "short_name": "Short name",
  // page to load on start up
  "start_url": "/index.html",
  // page to include in PWA (. - all in root folder)
  "scope": ".",
  // Open in browser without URL of the browser
  "display": "standalone",
  "description": "Add some description",
  "background_color": "#2a2b30",
  "theme_color": "#3e70ff",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "img/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    }
    // ...
  ]
}
```

[TOP](#content)

# service-workers

[Check Browser Support](https://jakearchibald.github.io/isserviceworkerready/)

[Setting up Remote Debugging on Chrome](https://developers.google.com/web/tools/chrome-devtools/remote-debugging/)

[Getting that "Web App Install Banner"](https://developers.google.com/web/fundamentals/engage-and-retain/app-install-banners/)

[Getting Started with Service Workers](https://developers.google.com/web/fundamentals/getting-started/primers/service-workers)

- SW runs on additional thread

- SW events:
- Fetch (HTTP Request native js **_fetch_** function )
- Push notifications from Server
- Notification Interaction with User
- Background Sync when Internet connection is restored
- Life cycle - Phase changes

In the package.json **_http-server -c-1_** means do not cash using normal browser cache.

Server worker must be included in all pages so put that in script that is called in all .html files like app.js.

Service workers work only on https.

**_To import other scripts in SW_**

```js
importScripts('/src/js/file.js');
```

```js
/* SW registration app.js file */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then(function() {
    console.log('Service worker registered!');
  });
}

/* Control banner prompt for PWA installation (stop default chrome banner) */
window.addEventListener('beforeinstallprompt', function(event) {
  event.preventDefault();
  windows.deferredPrompt = event;
  return false;
});

/* Add function on button or mounted event*/
/**
<div class="pwa-install-wrapper">
<button class="add-button" id="install">
    Add to
</button>
</div>
**/

installPWA() {
  btn = document.getElementById("install");
  wrapper = document.getElementsByClassName("pwa-install-wrapper")[0];
  window.deferredPrompt = {};

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    // Toggle show/hide button
    wrapper.classList.toggle("pwa-active", true);
    window.deferredPrompt = e;
    // Button to trigger installation
    btn.addEventListener("click", () => {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then(result => {
        wrapper.classList.toggle("pwa-active", false);
        window.deferredPrompt = null;
      });
    });
  });

  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
    ) {
      wrapper.classList.toggle("pwa-active", false);
    }

  window.addEventListener("appinstalled", () => {
    console.log("App successfully installed 👍");
  });
```

```js
/* service-worker.js file */

/* Life cycle events */
self.addEventListener('install', event => {
  console.log('[SW installing]', event);
});

self.addEventListener('activate', event => {
  console.log('[SW activate]', event);
  return self.client.claim();
});

/* Non life cycle events */

self.addEventListener('fetch', event => {
  console.log('[SW fetching]', event);
  event.respondWith();
});
```

[TOP](#content)

# caching

Providing Offline support <br/>

Useful Links:

[About Cache Persistence and Storage Limits](https://jakearchibald.com/2014/offline-cookbook/#cache-persistence)

[Learn more about Service Workers](https://developer.mozilla.org/en/docs/Web/API/Service_Worker_API)

[Google's Introduction to Service Workers](https://developers.google.com/web/fundamentals/getting-started/primers/service-workers)

Note: You can access **caches** in normal JS also but alway check if SW is supported (look at **_Cache on user demand_**).

**_To cache content in Service worker use:_**

```js
const CACHE_STATIC_NAME = 'pre-cache-static-v0';
/** all files need to be relative to root folder */
const STATIC_FILES = ['/src/css/app.css'];

/** Here you can chose any life cycle that is suited for you */
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker ...', event);

  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then(cache => {
      console.log('[Service Worker] Pre caching App Shell');
      cache.addAll(STATIC_FILES);
    })
  );
});
```

**_To fetch cache content in Service worker use:_**

```js
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
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
          // cache for offline page (if help page is not cached)
          return caches.open(CACHE_STATIC_NAME).then(cache => {
            return cache.match('/offline.html');
          });
        });
    })
  );
});
```

**_To delete old cache versions:_**

```js
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
```

**_Cache on user demand_**

```js
/* call this function with button */
const onUserCache = () => {
  if ('caches' in window) {
    const CACHE_NAME = 'user-request';
    caches.open(CACHE_NAME).then(cache => {
      cache.add('some_url_request');
      cache.add('Some response');
    });
  }
};
```

[TOP](#content)

# advance

**_App Advanced Caching with Service Worker_**

Type of caching

1. Cache with Network Fallback (Cache first then network) <br/>
   **_good - instant load from cache_** <br/>
   **_bad - we parse everything_**

```js
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }

      return fetch(event.request)
        .then((res) => {
          return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
            cache.put(event.request.url, res.clone());
            return res;
          });
        })
        .catch(function(err) {
          // offline page fallback
          return caches.open(CACHE_STATIC_NAME).then(function(cache) {
            return cache.match('/offline.html');
          });
        });
      }
    })
  );
});
```

2. Cache only<br/>
   **_good - ignore network_** <br/>
   **_bad - not work ok_**

```js
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request));
});
```

3. Network only<br/>
   **_good - normal status_**<br/>
   **_bad - do not have sense in stand alone_**

```js
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
```

4. Network with Cache Fallback (Network first then cache)<br/>
   **_good - use cache if there is not network_**
   **_bad - hard to simulate also if there is a bad connection not good experience_**
   **_bad - if connection fail we need to wait for 60 sec to grab data from cache_**

```js
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(res => {
        return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
          cache.put(event.request.url, res.clone());
          return res;
        });
      })
      .catch(err => {
        return caches.match(event.request);
      })
  );
});
```

5. Cache then Network
   **_good - very useful_**

```js
self.addEventListener('fetch', event => {
  // Offline support
  const url = 'Some_url_to_fetch_data (Posts or card or pokemon ...)';

  if (event.request.url.indexOf(url) > -1) {
    // This is normal network first
    event.respondWith(
      fetch(event.request).then(res => {
        // store response in db
        var clonedRes = res.clone();
        clearAllData('posts')
          .then(function() {
            return clonedRes.json();
          })
          .then(function(data) {
            for (var key in data) {
              // function from utility.js
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
      // Use old cache then Network fallback
      caches.match(event.request).then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request)
            .then((res) => {
              return caches.open(CACHE_DYNAMIC_NAME).then((cache) => {
                // trimCache(CACHE_DYNAMIC_NAME, 3);
                cache.put(event.request.url, res.clone());
                return res;
              });
            })
            .catch((err) => {
              return caches.open(CACHE_STATIC_NAME).then((cache) => {
                if (event.request.headers.get('accept').includes('text/html')) {
                  return cache.match('/offline.html');
                }
              });
            });
        }
      })
    );
  }
});
```

#### Clean cache

```js
const trimCache = (cacheName, maxItemsToStay) => {
  caches.open(cacheName).then(cache => {
    return cache.keys().then(keys => {
      if (keys.length > maxItemsToStay) {
        cache.delete(keys[0]).then(trimCache(cacheName, maxItemsToStay));
      }
    });
  });
};
```

#### Unregister SW

```js
const unRegisterServiceWorkers = async () => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (let registration of registrations) {
    registration.unregister();
  }
};
```

Useful Links:

[Great overview over Strategies - the Offline Cookbook:](https://jakearchibald.com/2014/offline-cookbook/)

[Advanced Caching Guide:](https://afasterweb.com/2017/01/31/upgrading-your-service-worker-cache/)

[Mozilla Strategy Cookbook:](https://serviceworke.rs/strategy-cache-and-update_service-worker_doc.html)

[TOP](#content)

# firebase

[Firebase](https://firebase.google.com/?gclid=Cj0KCQiAnL7yBRD3ARIsAJp_oLZzoEFFu3Nb3Xd_EBt_W4cjHJS8XckdZIKTD7BT4XkX_1ik_B5_w9MaAgGwEALw_wcB)

Create an google account and login on firebase

**_Database_**

- create an database and add some data

**_IndexedDB_**

[Browser Support](http://caniuse.com/#feat=indexeddb)

[IDB on Github](https://github.com/jakearchibald/idb)

[IndexedDB explained on MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

[Alternative to IDB](http://dexie.org/)

[TOP](#content)

# sync

[Introducing Background Sync](https://developers.google.com/web/updates/2015/12/background-sync)

[Basic Guide to Background Sync](https://ponyfoo.com/articles/backgroundsync)

[More about Firebase Cloud Functions](https://firebase.google.com/docs/functions/)

In normal JS files

```js
if ('serviceWorker' in navigator && 'SyncManager' in window) {
  navigator.serviceWorker.ready.then(sw => {
    /** Do sync logic */
  });
}
```

In SW.js file

```js
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background Sync: ', event);
  /** Make your own tag */
  if (event.tag === 'sync-new-posts') {
    console.log('[SW] Syncing new post');
    event.waitUntil(/** Do logic */);
  }
});
```

**_Periodic Sync_**

In Firebase you can set up your End Point go to **_Function_** tab

Install firebase tools CLI

```console
sudo npm install -g firebase-tools
```

Navigate to project folder and run

```console
firebase init
```

Chose options

- Functions and Hosting
- Project
- Install dependency
- Overwrite index.html **_NO_**

This will generate some files like

- function (folder)
  - Here you write your REST API points in **_index.js_**
- firebase.json
- .firebasesrc

Navigate to **_function_** folder

```console
npm install firebase-admin cors
```

To **_Deploy_** application use:

```console
firebase deploy
```

After you run this command you will receive URL where your app is served and also URL for your REST API end point

Add REST API end point to SW sync call without .json

[TOP](#content)

# notifications

[Web Push by Google](https://developers.google.com/web/fundamentals/engage-and-retain/push-notifications/)

[VAPID](https://blog.mozilla.org/services/2016/04/04/using-vapid-with-webpush/)

[VAPID by Google](https://developers.google.com/web/updates/2016/07/web-push-interop-wins)

[web-push Package](https://github.com/web-push-libs/web-push)

[showNotification (Notifications from Service Workers)](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification)

[The Notification API](https://developer.mozilla.org/en/docs/Web/API/notification)

[The Push API](https://developer.mozilla.org/en/docs/Web/API/Push_API)

First ask user for notification permission

```js
/** register event */
someButton.addEventListener('click', askForNotificationPermission);

const askForNotificationPermission = () => {
  Notification.requestPermission(result => {
    console.log('User Choice: ', result);
    if (result !== 'granted') {
      console.log('No notification permission granted!');
      return;
    }
    /** Hide the button and configure notifications (NOTE: this is just simple notification) **/
    const options = {
      body: 'You successfully subscribed to our Notifications service!'
    };
    new Notification('Successfully subscribed!', options);
  });
};
```

**_Notification options_**

```js
const options = {
  body: 'You successfully subscribed to our Notifications service!',
  icon: '/src/images/icons/app-icon-48x48.png',
  image: '/src/images/sf-boat.jpg',
  dir: 'ltr',
  lang: 'en-US',
  vibrate: [100, 50, 200], // vibration, pause, vibration ...
  badge: '/src/images/icons/app-icon-96x96.png',
  tag: 'confirm-notification',
  renotify: true,
  actions: [
    {
      action: 'confirm',
      title: 'OK',
      icon: '/src/images/icons/app-icon-48x48.png'
    },
    {
      action: 'cancel',
      title: 'Cancel',
      icon: '/src/images/icons/app-icon-48x48.png'
    }
  ]
};
```

Register event on **_Actions_** from Notification options

```js
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action = event.action; // confirm || cancel

  if (action === 'confirm') {
    console.log('Confirm was chosen!');
    notification.close();
    return;
  }

  /** If user press cancel */
});
```

Register event on x to close notification

```js
self.addEventListener('notificationclose', event => {
  console.log('Notification is closed!', event);
});
```

**_Secure Push notifications_**

```js
// check VAPID
const vapidPublicKey = 'LOOK HOW TO GET BELOW';
const convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);

return reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: convertedVapidPublicKey
});
```

Use **_web-push_** package navigate to functions folder

```console
npm install web-push
```

in functions/package.json add new script

```js
"scripts": {
  ...,
  "web-push": "web-push"
}
```

Now run:

```console
npm run web-push generate-vapid-keys
```

This will give you **_Public_** and **_Private_** key

#### send push notifications from server

in function/index.js

```js
const webpush = require('web-push');

cors(request, response, () => {
  const uuid = UUID();

  admin
    .database()
    .ref('posts')
    .push({
      /* Your data object */
    })
    .then(() => {
      webpush.setVapidDetails(
        'mailto: example@gmail.com',
        'PUBLIC_KEY_FROM_WEB_PUSH',
        'PRIVATE_KEY_FORM_WEB_PUSH'
      );
      return admin
        .database()
        .ref('subscriptions')
        .once('value');
    })
    .then(subscriptions => {
      subscriptions.forEach(sub => {
        const pushConfig = {
          endpoint: sub.val().endpoint,
          keys: {
            auth: sub.val().keys.auth,
            p256dh: sub.val().keys.p256dh
          }
        };

        webpush
          .sendNotification(
            pushConfig,
            JSON.stringify({
              title: 'New Post',
              content: 'New Post added!',
              openUrl: '/help/'
            })
          )
          .catch(err => {
            console.log(err);
          });
      });
      response.status(201).json({ message: 'Data stored', id: fields.id });
    })
    .catch(err => {
      response.status(500).json({ error: err });
    });
});
```

#### Listening for push notifications in SW

```js
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
```

[TOP](#content)

# native

[Media Stream API on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Media_Streams_API/Constraints)

[getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

[geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/Using_geolocation)

**_Accessing camera_**

```html
<video id="player" autoplay></video>
<canvas id="canvas" width="320px" height="240px"></canvas>
<button
  class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
  id="capture-btn"
>
  Capture
</button>
<div id="pick-image">
  <h6>Pick an Image insted</h6>
  <input type="file" accept="image/*" id="image-picker" />
</div>
```

```js
const initializeMedia = () => {
  if (!('mediaDevices' in navigator)) {
    /* create an polyfill if mediaDevice is not supported */
    navigator.mediaDevices = {};
  }

  if (!('getUserMedia' in navigator.mediaDevices)) {
    navigator.mediaDevices.getUserMedia = constraints => {
      const getUserMedia =
        navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented!'));
      }

      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }
  /**  we can pass audio:true to object also **/
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(stream => {
      videoPlayer.srcObject = stream;
      videoPlayer.style.display = 'block';
    })
    .catch(err => {
      /** Show image picker fallback */
      imagePickerArea.style.display = 'block';
    });
};
```

Clean up devices

```js
const stopVideoPlayer = () => {
  if (videoPlayer && videoPlayer.srcObject) {
    videoPlayer.srcObject.getVideoTracks().forEach(track => {
      track.stop();
    });
  }
};

const mediaCleanUp = () => {
  stopVideoPlayer();
  imagePickerArea.style.display = 'none';
  videoPlayer.style.display = 'none';
  canvasElement.style.display = 'none';
  // locationBtn.style.display = 'inline';
  // locationLoader.style.display = 'none';
  captureButton.style.display = 'inline';
};
```

Capture image

```js
captureButton.addEventListener('click', event => {
  canvasElement.style.display = 'block';
  videoPlayer.style.display = 'none';
  captureButton.style.display = 'none';
  const context = canvasElement.getContext('2d');
  context.drawImage(
    videoPlayer,
    0,
    0,
    canvas.width,
    videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width)
  );
  stopVideoPlayer();
  picture = dataURItoBlob(canvasElement.toDataURL());
});
```

**_Accessing geo location_**

```js
const locationBtn = document.querySelector('#location-btn');
const locationLoader = document.querySelector('#location-loader');
const fetchedLocation = { lat: 0, lng: 0 };
```

```js
const initializeLocation = () => {
  if (!('geolocation' in navigator)) {
    locationBtn.style.display = 'none';
  }
};
```

Register event

```js
locationBtn.addEventListener('click', event => {
  if (!('geolocation' in navigator)) {
    return;
  }

  let sawAlert = false;

  locationBtn.style.display = 'none';
  locationLoader.style.display = 'block';

  navigator.geolocation.getCurrentPosition(
    position => {
      locationBtn.style.display = 'inline';
      locationLoader.style.display = 'none';
      fetchedLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      locationInput.value = 'In Some City';
      document.querySelector('#manual-location').classList.add('is-focused');
    },
    err => {
      console.log(err);
      locationBtn.style.display = 'inline';
      locationLoader.style.display = 'none';

      if (!sawAlert) {
        sawAlert = true;
        alert("Couldn't fetch location, pleas enter manually!");
      }
      fetchedLocation = { lat: 0, lng: 0 };
    },
    { timeout: 10000 }
  );
});
```

[TOP](#content)
