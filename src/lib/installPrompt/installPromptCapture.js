import { createInstallPromptCapture } from './createInstallPromptCapture.js';

const singleton = createInstallPromptCapture(typeof window !== 'undefined' ? window : null);

export const hasDeferredInstallPrompt = singleton.hasDeferredInstallPrompt;
export const subscribeToInstallPromptState = singleton.subscribeToInstallPromptState;
export const triggerInstallPrompt = singleton.triggerInstallPrompt;
