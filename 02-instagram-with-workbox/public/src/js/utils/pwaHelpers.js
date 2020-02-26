const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker.register('/service-worker.js');
    console.log('Service worker registered!');
  }
};

const preventPWADefaultInstallation = () => {
  window.addEventListener('beforeinstallprompt', event => {
    console.log('[preventPWADefaultInstallation] fired');
    event.preventDefault();
    window.deferredPrompt = event;
    return false;
  });
};

const triggerPWAInstallation = btn => {
  btn.addEventListener('click', async () => {
    window.deferredPrompt.prompt();
    const result = await window.deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      btn.classList.toggle('pwa-active', false);
      window.deferredPrompt = null;
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('App successfully installed 👍');
  });
};

const checkIfPWAisInstalled = btn => {
  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  ) {
    btn.classList.toggle('pwa-active', false);
  }
};
