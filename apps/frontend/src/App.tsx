import React, { useEffect, ErrorInfo } from 'react';
import { StatusBar, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from './store/auth';
import { initializeGoogleSignIn } from './services/google-oauth';
import { GOOGLE_WEB_CLIENT_ID } from './config/constants';

// Screens
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import HomeScreen from './screens/home/HomeScreen';
import VisaApplicationScreen from './screens/visa/VisaApplicationScreen';
import DocumentsScreen from './screens/documents/DocumentsScreen';
import ChatScreen from './screens/chat/ChatScreen';
import ProfileScreen from './screens/profile/ProfileScreen';

// Theme colors
const colors = {
  primary: '#1E88E5',
  secondary: '#FFA726',
  success: '#43A047',
  danger: '#E53935',
  warning: '#FB8C00',
  dark: '#212121',
  light: '#FFFFFF',
  gray: '#757575',
  lightGray: '#E0E0E0',
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ============================================================================
// AUTH STACK
// ============================================================================
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        cardStyle: { backgroundColor: colors.light },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// ============================================================================
// APP TABS (Main Screen)
// ============================================================================
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = '';

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Applications':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Documents':
              iconName = focused ? 'folder' : 'folder-outline';
              break;
            case 'Chat':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'home-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: {
          backgroundColor: colors.light,
          borderTopColor: colors.lightGray,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.light,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Visa Explorer' }}
      />
      <Tab.Screen
        name="Applications"
        component={VisaApplicationScreen}
        options={{ title: 'My Applications' }}
      />
      <Tab.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{ title: 'Documents' }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ 
          title: 'AI Assistant',
          tabBarBadge: 3, // Placeholder for unread messages
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// ============================================================================
// ERROR BOUNDARY
// ============================================================================
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('=== ERROR BOUNDARY: getDerivedStateFromError ===', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('=== ERROR BOUNDARY: componentDidCatch ===', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#000' }}>
            App Error
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Text style={{ fontSize: 12, color: '#999', marginTop: 20, textAlign: 'center' }}>
            {this.state.error?.stack}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
function AppContent() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const initializeApp = useAuthStore((state) => state.initializeApp);

  useEffect(() => {
    console.log('=== APP.TSX: useEffect Starting ===');
    
    // Initialize app on launch
    initializeApp().catch((error) => {
      console.error('=== APP.TSX: initializeApp Error ===', error);
    });
    
    // Initialize Google Sign-In
    if (GOOGLE_WEB_CLIENT_ID && GOOGLE_WEB_CLIENT_ID !== 'YOUR_GOOGLE_WEB_CLIENT_ID_HERE') {
      initializeGoogleSignIn(GOOGLE_WEB_CLIENT_ID).catch((error) => {
        console.warn('=== APP.TSX: Failed to initialize Google Sign-In ===', error);
        // Continue anyway - Google OAuth is optional
      });
    } else {
      console.warn('=== APP.TSX: Google Web Client ID not configured ===');
    }
  }, []);
  
  console.log('=== APP.TSX: Render ===', { isLoading, isSignedIn });

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar
            barStyle="light-content"
            backgroundColor={colors.primary}
            translucent={false}
          />
          {isSignedIn ? <AppTabs /> : <AuthStack />}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}