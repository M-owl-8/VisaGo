/**
 * Polyfills for Expo/React Native
 * Ensures all necessary globals are available
 * 
 * IMPORTANT: This file must NOT use require() or any Node.js-specific APIs
 * It runs before Metro's runtime is fully initialized
 */

// Use IIFE to avoid polluting global scope during module evaluation
(function() {
  'use strict';
  
  // Ensure global object exists (for Node.js compatibility)
  if (typeof global === 'undefined') {
    // @ts-ignore
    var global = typeof globalThis !== 'undefined' ? globalThis : 
                 typeof window !== 'undefined' ? window : 
                 typeof self !== 'undefined' ? self : {};
  }
  
  // Ensure process is available with minimal env support
  // This must be done carefully to avoid triggering require() calls
  if (typeof process === 'undefined') {
    // @ts-ignore
    global.process = {
      env: {},
      nextTick: function(fn) {
        if (typeof setTimeout !== 'undefined') {
          setTimeout(fn, 0);
        }
      },
      version: '',
      versions: {},
    };
    
    // Make process available globally
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.process = global.process;
    }
  }
  
  // Ensure __DEV__ is defined (used by React Native and Expo)
  if (typeof __DEV__ === 'undefined') {
    // @ts-ignore
    global.__DEV__ = true;
    
    // Set NODE_ENV in process.env safely
    try {
      if (global.process && global.process.env) {
        global.process.env.NODE_ENV = 'development';
      }
    } catch (e) {
      // Ignore errors during initialization
    }
  }
  
  // Ensure console is available (should already exist, but just in case)
  if (typeof console === 'undefined') {
    // @ts-ignore
    global.console = {
      log: function() {},
      warn: function() {},
      error: function() {},
      info: function() {},
      debug: function() {},
    };
  }
})();

// Note: require() is provided by Metro bundler at runtime
// DO NOT try to polyfill require() here - it will cause the "runtime not ready" error
// Metro bundler injects the require function when the bundle loads
// If require doesn't exist, it means Metro hasn't finished loading the bundle yet

