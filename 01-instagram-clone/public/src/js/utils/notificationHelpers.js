const displayConfirmNotification = () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const options = {
    body: 'You successfully subscribed to our Notifications service!',
    icon: '/src/images/icons/app-icon-48x48.png',
    image: '/src/images/main-image-sm.jpg',
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

  navigator.serviceWorker.ready.then(swRegister => {
    swRegister.showNotification('Successfully subscribed!', options);
  });

  /** Simple Regular Notification */
  /*
  const options = {
    body: 'You successfully subscribed to our Notifications service!'
  };
  new Notification('Successfully subscribed!', options);
  */
};

const configurePushSub = () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  let reg;
  navigator.serviceWorker.ready
    .then(swRegister => {
      reg = swRegister;
      return swRegister.pushManager.getSubscription();
    })
    .then(subscription => {
      if (subscription !== null) {
        /** We have subscription do some logic */
        return;
      }
      /** Create new subscription */
      const vapidPublicKey =
        'BEBSGg3VXqIQc6WZdUDv9jUMOU09R6ylGOX0Q31Gil3i8Ce2QLOun3ZCW-shFVWxAScp_frJjQ8G5dh-D2EQCqo';
      const convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);

      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidPublicKey
      });
    })
    .then(async newSubscription => {
      const data = await makeApiCall('subscriptions', 'POST', newSubscription);
      displayConfirmNotification();
    })
    .catch(err => {
      console.log(err);
    });
};

const askForNotificationPermission = () => {
  Notification.requestPermission(result => {
    console.log('User Choice: ', result);
    if (result !== 'granted') {
      console.log('No notification permission granted!');
      return;
    }
    // Hide the button
    configurePushSub();
  });
};

const enableNotifications = buttons => {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    for (let button of buttons) {
      button.style.display = 'inline-block';
      button.addEventListener('click', askForNotificationPermission);
    }
  }
};
