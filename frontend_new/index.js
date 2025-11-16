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
import messaging from '@react-native-firebase/messaging';

import { handleBackgroundNotification } from './src/services/pushNotifications';

// Import the main App component
import App from './src/App';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  await handleBackgroundNotification(remoteMessage);
});

// Register the root component with AppRegistry
// Component name MUST be "main" to match Android MainActivity.getMainComponentName()
// See: android/app/src/main/java/com/visabuddy/app/MainActivity.kt line 19
// The MainActivity returns "main" from getMainComponentName()
AppRegistry.registerComponent('frontend_new', () => App);