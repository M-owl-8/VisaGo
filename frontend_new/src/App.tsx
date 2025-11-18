import React, { useEffect, ErrorInfo, useState } from 'react';
import { StatusBar, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { shallow } from 'zustand/shallow';
import { useAuthStore } from './store/auth';
import { initializeGoogleSignIn } from './services/google-oauth';
import { GOOGLE_WEB_CLIENT_ID } from './config/constants';
import { initializeErrorLogger, logError, setUserContext } from './services/errorLogger';
import { startNetworkMonitoring, stopNetworkMonitoring } from './services/network';
import { OfflineBanner } from './components/OfflineBanner';
import { useNotificationStore } from './store/notifications';
import { initializePushNotifications, cleanupPushNotifications } from './services/pushNotifications';

initializeErrorLogger();

// Screens
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import QuestionnaireScreen from './screens/onboarding/QuestionnaireScreen';
import HomeScreen from './screens/home/HomeScreen';
import VisaApplicationScreen from './screens/visa/VisaApplicationScreen';
import ApplicationDetailScreen from './screens/visa/ApplicationDetailScreen';
import {ChatScreen} from './screens/chat/ChatScreen';
import ProfileScreen from './screens/profile/ProfileScreen';
import {DocumentUploadScreen} from './screens/documents/DocumentUploadScreen';
import {DocumentPreviewScreen} from './screens/documents/DocumentPreviewScreen';

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
        contentStyle: {backgroundColor: colors.light},
      }}>
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
      screenOptions={({route}) => ({
        headerShown: true,
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string = '';

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Applications':
              iconName = focused ? 'document-text' : 'document-text-outline';
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
        tabBarActiveTintColor: '#4A9EFF',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#0F1E2D',
          borderTopColor: 'rgba(74, 158, 255, 0.2)',
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        headerStyle: {
          backgroundColor: '#0A1929',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(74, 158, 255, 0.2)',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 20,
          color: '#FFFFFF',
        },
        headerBackTitleVisible: false,
        headerBackImage: () => (
          <Icon
            name="arrow-back"
            size={24}
            color="#FFFFFF"
            style={{marginLeft: 16}}
          />
        ),
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Progress',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Applications"
        component={VisaApplicationScreen}
        options={{
          title: 'Applications',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'AI Assistant',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'Profile'}}
      />
    </Tab.Navigator>
  );
}

// ============================================================================
// MAIN APP STACK (Wraps tabs with modal screens)
// ============================================================================
function MainAppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="MainTabs" component={AppTabs} />
      <Stack.Screen
        name="ApplicationDetail"
        component={ApplicationDetailScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="DocumentUpload"
        component={DocumentUploadScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="DocumentPreview"
        component={DocumentPreviewScreen}
        options={{
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}

// ============================================================================
// ERROR BOUNDARY
// ============================================================================
class ErrorBoundary extends React.Component<
  {children: React.ReactNode},
  {hasError: boolean; error?: Error}
> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = {hasError: false};
  }

  static getDerivedStateFromError(error: Error) {
    console.error('=== ERROR BOUNDARY: getDerivedStateFromError ===', error);
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError(error, {
      source: 'AppErrorBoundary',
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            backgroundColor: '#fff',
          }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 10,
              color: '#000',
            }}>
            App Error
          </Text>
          <Text style={{fontSize: 14, color: '#666', textAlign: 'center'}}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: '#999',
              marginTop: 20,
              textAlign: 'center',
            }}>
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
  const user = useAuthStore((state) => state.user);
  const initializeApp = useAuthStore((state) => state.initializeApp);
  const [forceShow, setForceShow] = useState(false);
  const {
    preferences,
    preferencesLoaded,
    loadPreferences,
    clearDeviceToken,
  } = useNotificationStore(
    (state) => ({
      preferences: state.preferences,
      preferencesLoaded: state.preferencesLoaded,
      loadPreferences: state.loadPreferences,
      clearDeviceToken: state.clearDeviceToken,
    }),
    shallow
  );

  // Check if questionnaire is completed - this will automatically update when user state changes
  const needsQuestionnaire = isSignedIn && user && !user.questionnaireCompleted;

  // Debug logging - watch for user changes
  useEffect(() => {
    console.log('=== APP.TSX: User state changed ===', {
      isSignedIn,
      hasUser: !!user,
      userId: user?.id,
      questionnaireCompleted: user?.questionnaireCompleted,
      needsQuestionnaire,
    });
  }, [isSignedIn, user, needsQuestionnaire]);

  useEffect(() => {
    console.log('=== APP.TSX: useEffect Starting ===');

    let mounted = true;

    // Initialize app on launch with timeout fallback
    const initApp = async () => {
      try {
        await initializeApp();
        console.log('=== APP.TSX: initializeApp completed ===');
      } catch (error) {
        console.error('=== APP.TSX: initializeApp Error ===', error);
        // Force loading to false if initialization fails
        if (mounted) {
          // The store should handle this, but ensure we don't stay stuck
          setTimeout(() => {
            if (mounted) {
              console.log(
                '=== APP.TSX: Force setting loading to false after error ===',
              );
            }
          }, 1000);
        }
      }
    };

    // Add a safety timeout - if initialization takes more than 10 seconds, force continue
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        // Only log in development, suppress in production
        if (__DEV__) {
          console.warn(
            '=== APP.TSX: Safety timeout - initialization taking too long ===',
          );
        }
      }
    }, 10000);

    initApp();

    // Initialize Google Sign-In (non-blocking)
    if (
      GOOGLE_WEB_CLIENT_ID &&
      GOOGLE_WEB_CLIENT_ID !== 'YOUR_GOOGLE_WEB_CLIENT_ID_HERE'
    ) {
      initializeGoogleSignIn(GOOGLE_WEB_CLIENT_ID).catch(error => {
        // Only log in development, suppress in production
        if (__DEV__) {
          console.warn(
            '=== APP.TSX: Failed to initialize Google Sign-In ===',
            error,
          );
        }
        // Continue anyway - Google OAuth is optional
      });
    } else {
      // Only log in development, suppress in production
      if (__DEV__) {
        console.log(
          '=== APP.TSX: Google Web Client ID not configured (optional feature) ===',
        );
      }
    }

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
    };
  }, []);

  useEffect(() => {
    startNetworkMonitoring();
    return () => {
      stopNetworkMonitoring();
    };
  }, []);

  useEffect(() => {
    if (user) {
      setUserContext({
        id: user.id,
        email: user.email,
      });
    } else {
      setUserContext(null);
    }
  }, [user]);

  useEffect(() => {
    if (isSignedIn && !preferencesLoaded) {
      loadPreferences().catch((error) =>
        logError(error, {
          scope: 'NotificationPreferences',
          message: 'Failed to load notification preferences',
        })
      );
    }
  }, [isSignedIn, preferencesLoaded, loadPreferences]);

  useEffect(() => {
    if (!isSignedIn) {
      cleanupPushNotifications();
      clearDeviceToken();
      return;
    }

    if (!preferencesLoaded) {
      return;
    }

    if (!preferences.pushNotifications) {
      cleanupPushNotifications();
      clearDeviceToken();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await initializePushNotifications();
      } catch (error) {
        if (!cancelled) {
          logError(error, {
            scope: 'PushNotifications',
            message: 'Failed to initialize push notifications',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanupPushNotifications();
    };
  }, [isSignedIn, preferencesLoaded, preferences.pushNotifications, clearDeviceToken]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setForceShow(true);
    }, 4000);
    return () => clearTimeout(timeout);
  }, []);

  console.log('=== APP.TSX: Render ===', {isLoading, isSignedIn});

  if (isLoading && !forceShow) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <View style={{flex: 1}}>
          <OfflineBanner />
          <NavigationContainer>
            <StatusBar
              barStyle="light-content"
              backgroundColor={colors.primary}
              translucent={false}
            />
            {isSignedIn ? (
              needsQuestionnaire ? (
                <Stack.Navigator screenOptions={{headerShown: false}}>
                  <Stack.Screen
                    name="Questionnaire"
                    component={QuestionnaireScreen}
                  />
                </Stack.Navigator>
              ) : (
                <MainAppStack />
              )
            ) : (
              <AuthStack />
            )}
          </NavigationContainer>
        </View>
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
