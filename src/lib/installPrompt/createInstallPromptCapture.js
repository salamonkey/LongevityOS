export function createInstallPromptCapture(eventTarget) {
  let deferredEvent = null;
  const subscribers = new Set();

  function notify() {
    const state = { hasDeferredInstallPrompt: deferredEvent !== null };
    subscribers.forEach((callback) => callback(state));
  }

  function handleBeforeInstallPrompt(event) {
    event.preventDefault();
    deferredEvent = event;
    notify();
  }

  function handleAppInstalled() {
    deferredEvent = null;
    notify();
  }

  eventTarget?.addEventListener?.('beforeinstallprompt', handleBeforeInstallPrompt);
  eventTarget?.addEventListener?.('appinstalled', handleAppInstalled);

  return {
    hasDeferredInstallPrompt() {
      return deferredEvent !== null;
    },
    subscribeToInstallPromptState(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    async triggerInstallPrompt() {
      if (!deferredEvent) {
        return null;
      }
      const event = deferredEvent;
      event.prompt();
      const choice = await event.userChoice;
      deferredEvent = null;
      notify();
      return choice;
    },
    dispose() {
      eventTarget?.removeEventListener?.('beforeinstallprompt', handleBeforeInstallPrompt);
      eventTarget?.removeEventListener?.('appinstalled', handleAppInstalled);
      subscribers.clear();
    },
  };
}
