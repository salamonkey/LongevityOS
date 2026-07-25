import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ADD_TO_HOME_SCREEN_VARIANT,
  detectPlatform,
  isStandaloneDisplayMode,
  resolveAddToHomeScreenVariant,
} from '../../src/features/add-to-home-screen/model.js';

const IPHONE_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_CRIOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1';
const IPAD_SAFARI_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';
const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const DESKTOP_SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

test('detectPlatform recognizes iPhone Safari as ios', () => {
  assert.equal(detectPlatform(IPHONE_SAFARI_UA), 'ios');
});

test('detectPlatform recognizes iPhone Chrome (CriOS) as ios', () => {
  assert.equal(detectPlatform(IPHONE_CRIOS_UA), 'ios');
});

test('detectPlatform recognizes iPad Safari as ios', () => {
  assert.equal(detectPlatform(IPAD_SAFARI_UA), 'ios');
});

test('detectPlatform recognizes Android Chrome as android', () => {
  assert.equal(detectPlatform(ANDROID_CHROME_UA), 'android');
});

test('detectPlatform recognizes desktop Chrome as other', () => {
  assert.equal(detectPlatform(DESKTOP_CHROME_UA), 'other');
});

test('detectPlatform recognizes desktop Safari as other', () => {
  assert.equal(detectPlatform(DESKTOP_SAFARI_UA), 'other');
});

test('detectPlatform treats missing/non-string user agent as other', () => {
  assert.equal(detectPlatform(undefined), 'other');
  assert.equal(detectPlatform(null), 'other');
});

test('isStandaloneDisplayMode is true when the media query matches', () => {
  assert.equal(isStandaloneDisplayMode({ matches: true }, false), true);
});

test('isStandaloneDisplayMode is true when navigator.standalone is true', () => {
  assert.equal(isStandaloneDisplayMode({ matches: false }, true), true);
});

test('isStandaloneDisplayMode is false when neither signal is set', () => {
  assert.equal(isStandaloneDisplayMode({ matches: false }, false), false);
  assert.equal(isStandaloneDisplayMode(undefined, undefined), false);
});

test('resolveAddToHomeScreenVariant hides the button when already standalone', () => {
  const variant = resolveAddToHomeScreenVariant({ platform: 'ios', isStandalone: true, hasDeferredPrompt: true });
  assert.equal(variant, ADD_TO_HOME_SCREEN_VARIANT.HIDDEN);
});

test('resolveAddToHomeScreenVariant shows ios instructions on iOS regardless of deferred prompt', () => {
  const variant = resolveAddToHomeScreenVariant({ platform: 'ios', isStandalone: false, hasDeferredPrompt: false });
  assert.equal(variant, ADD_TO_HOME_SCREEN_VARIANT.IOS_INSTRUCTIONS);
});

test('resolveAddToHomeScreenVariant shows the native prompt when a deferred prompt is captured', () => {
  const variant = resolveAddToHomeScreenVariant({ platform: 'android', isStandalone: false, hasDeferredPrompt: true });
  assert.equal(variant, ADD_TO_HOME_SCREEN_VARIANT.NATIVE_PROMPT);
});

test('resolveAddToHomeScreenVariant hides the button on other platforms without a deferred prompt', () => {
  const variant = resolveAddToHomeScreenVariant({ platform: 'other', isStandalone: false, hasDeferredPrompt: false });
  assert.equal(variant, ADD_TO_HOME_SCREEN_VARIANT.HIDDEN);
});
