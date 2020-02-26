/** cache the DOM */
const btn = document.getElementById('install');
const enableNotificationButtons = document.querySelectorAll(
  '.enable-notifications'
);
/** Set polyfills */
if (!window.Promise) {
  window.Promise = Promise;
}

/** This function you can find in pwaHelpers.js */
registerServiceWorker();
preventPWADefaultInstallation();
checkIfPWAisInstalled(btn);
triggerPWAInstallation(btn);

/** This function you can find in notificationHelpers.js */
enableNotifications(enableNotificationButtons);
