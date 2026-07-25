import test from 'node:test';
import assert from 'node:assert/strict';

import { createInstallPromptCapture } from '../../src/lib/installPrompt/createInstallPromptCapture.js';

function createFakeEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) {
        listeners.delete(type);
      }
    },
    dispatch(type, event) {
      listeners.get(type)?.(event);
    },
  };
}

test('createInstallPromptCapture has no deferred prompt before beforeinstallprompt fires', () => {
  const target = createFakeEventTarget();
  const capture = createInstallPromptCapture(target);

  assert.equal(capture.hasDeferredInstallPrompt(), false);
});

test('createInstallPromptCapture stores the event and calls preventDefault when beforeinstallprompt fires', () => {
  const target = createFakeEventTarget();
  const capture = createInstallPromptCapture(target);
  let prevented = false;

  target.dispatch('beforeinstallprompt', {
    preventDefault: () => {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.equal(capture.hasDeferredInstallPrompt(), true);
});

test('createInstallPromptCapture notifies subscribers when state changes', () => {
  const target = createFakeEventTarget();
  const capture = createInstallPromptCapture(target);
  const states = [];
  const unsubscribe = capture.subscribeToInstallPromptState((state) => states.push(state));

  target.dispatch('beforeinstallprompt', { preventDefault: () => {} });
  unsubscribe();
  target.dispatch('appinstalled', {});

  assert.deepEqual(states, [{ hasDeferredInstallPrompt: true }]);
});

test('createInstallPromptCapture triggerInstallPrompt prompts, awaits userChoice, and clears state', async () => {
  const target = createFakeEventTarget();
  const capture = createInstallPromptCapture(target);
  let prompted = false;

  target.dispatch('beforeinstallprompt', {
    preventDefault: () => {},
    prompt: () => {
      prompted = true;
    },
    userChoice: Promise.resolve({ outcome: 'accepted' }),
  });

  const choice = await capture.triggerInstallPrompt();

  assert.equal(prompted, true);
  assert.deepEqual(choice, { outcome: 'accepted' });
  assert.equal(capture.hasDeferredInstallPrompt(), false);
});

test('createInstallPromptCapture triggerInstallPrompt resolves null when there is nothing deferred', async () => {
  const target = createFakeEventTarget();
  const capture = createInstallPromptCapture(target);

  const choice = await capture.triggerInstallPrompt();

  assert.equal(choice, null);
});

test('createInstallPromptCapture clears state when appinstalled fires', () => {
  const target = createFakeEventTarget();
  const capture = createInstallPromptCapture(target);

  target.dispatch('beforeinstallprompt', { preventDefault: () => {} });
  assert.equal(capture.hasDeferredInstallPrompt(), true);

  target.dispatch('appinstalled', {});
  assert.equal(capture.hasDeferredInstallPrompt(), false);
});

test('createInstallPromptCapture tolerates a missing event target', async () => {
  const capture = createInstallPromptCapture(null);

  assert.equal(capture.hasDeferredInstallPrompt(), false);
  assert.equal(await capture.triggerInstallPrompt(), null);
});
