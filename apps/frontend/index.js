import { AppRegistry } from 'react-native';

console.log('=== INDEX.JS: Starting app initialization ===');

try {
  console.log('=== INDEX.JS: Importing App component ===');
  const App = require('./src/App').default;
  const { name: appName } = require('./app.json');
  
  console.log('=== INDEX.JS: App imported successfully, appName:', appName);
  
  const AppWithErrorBoundary = () => {
    try {
      console.log('=== INDEX.JS: Rendering App component ===');
      return App();
    } catch (error) {
      console.error('=== INDEX.JS: Error in App render ===', error);
      throw error;
    }
  };
  
  AppRegistry.registerComponent(appName, () => AppWithErrorBoundary);
  console.log('=== INDEX.JS: App registered successfully ===');
} catch (error) {
  console.error('=== INDEX.JS: Critical error during initialization ===', error);
  console.error('=== INDEX.JS: Stack trace ===', error?.stack);
}