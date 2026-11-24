import 'react-native-url-polyfill/auto';
import * as ReactNative from 'react-native';

// Polyfill InteractionManager for React Native 0.88+ / Expo SDK 58
if (!ReactNative.InteractionManager || typeof ReactNative.InteractionManager.createInteractionHandle !== 'function') {
  const polyfill = {
    runAfterInteractions(task) {
      let handle;
      const promise = new Promise(resolve => {
        handle = typeof requestIdleCallback !== 'undefined'
          ? requestIdleCallback(() => resolve(task ? task() : undefined))
          : setTimeout(() => resolve(task ? task() : undefined), 0);
      });
      return {
        then: promise.then.bind(promise),
        done: (...args) => {},
        cancel: () => {
          if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(handle);
          else clearTimeout(handle);
        },
      };
    },
    createInteractionHandle() {
      return 1;
    },
    clearInteractionHandle(handle) {},
    setDeadline(deadline) {},
    addListener: () => ({ remove: () => {} }),
  };

  try {
    Object.defineProperty(ReactNative, 'InteractionManager', {
      configurable: true,
      enumerable: true,
      get: () => polyfill,
    });
  } catch (e) {
    ReactNative.InteractionManager = polyfill;
  }
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
