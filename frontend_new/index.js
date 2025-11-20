/**
 * Entry point for Ketdik React Native App
 * 
 * IMPORTANT: This file must use ES6 imports, NOT require()
 * Metro bundler provides require() at runtime, but it's not available during module evaluation
 * 
 * For Expo SDK 54 with bare React Native, we use AppRegistry with component name "main"
 * to match Android MainActivity.getMainComponentName()
 */

// Import polyfills FIRST - sets up global, process, __DEV__ before anything else
// This MUST be the first import to ensure runtime environment is ready
import './polyfills';

// Import React Native AppRegistry
// We use AppRegistry instead of Expo's registerRootComponent because:
// 1. This is a bare React Native project (has android/ folder)
// 2. Android MainActivity expects component name "main"
// 3. AppRegistry gives us more control over the component name
import { AppRegistry } from 'react-native';

// Setup Firebase messaging background handler
// This is deferred until Firebase is properly initialized in App.tsx
// Background message handler will be set up after Firebase initialization
// See: src/services/firebase.ts and src/App.tsx for initialization logic

// Import the main App component
import App from './src/App';

// Register the root component with AppRegistry
// Component name MUST be "main" to match Android MainActivity.getMainComponentName()
// See: android/app/src/main/java/com/visabuddy/app/MainActivity.java line 16
// The MainActivity returns "main" from getMainComponentName()
AppRegistry.registerComponent('main', () => App);