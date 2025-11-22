import React, {useEffect, ErrorInfo, useState} from 'react';
import {StatusBar, View, Text} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppIcon, IconSizes, IconColors} from './components/icons/AppIcon';
import {TabIcons} from './components/icons/iconConfig';
import {useAuthStore} from './store/auth';
import {initializeGoogleSignIn} from './services/google-oauth';
import {GOOGLE_WEB_CLIENT_ID} from './config/constants';
import {
  initializeErrorLogger,
  logError,
  setUserContext,
} from './services/errorLogger';
import {
  startNetworkMonitoring,
  stopNetworkMonitoring,
} from './services/network';
import {OfflineBanner} from './components/OfflineBanner';
import {useNotificationStore} from './store/notifications';
import {
  initializePushNotifications,
  cleanupPushNotifications,
  handleBackgroundNotification,
} from './services/pushNotifications';
import {
  initializeFirebase,
  setupBackgroundMessageHandler,
} from './services/firebase';
import './i18n'; // Initialize i18next
import {useTranslation} from 'react-i18next';
import {isHomePageFrozen} from './config/features';

initializeErrorLogger();

// Screens
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import QuestionnaireScreen from './screens/onboarding/QuestionnaireScreen';
import VisaApplicationScreen from './screens/visa/VisaApplicationScreen';
import ApplicationDetailScreen from './screens/visa/ApplicationDetailScreen';
import {ChatScreen} from './screens/chat/ChatScreen';
import ProfileScreen from './screens/profile/ProfileScreen';
import {DocumentUploadScreen} from './screens/documents/DocumentUploadScreen';
import {DocumentPreviewScreen} from './screens/documents/DocumentPreviewScreen';
import {ProfileEditScreen} from './screens/profile/ProfileEditScreen';
import {LanguageScreen} from './screens/profile/LanguageScreen';
import {SecurityScreen} from './screens/profile/SecurityScreen';
import {HelpSupportScreen} from './screens/profile/HelpSupportScreen';
import NotificationSettingsScreen from './screens/notifications/NotificationSettingsScreen';

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
  const {t} = useTranslation();

  return (
    <Tab.Navigator
      initialRouteName="Applications"
      screenOptions={({route}) => ({
        headerShown: true,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({focused, color}) => {
          let iconConfig;

          switch (route.name) {
            case 'Applications':
              iconConfig = focused
                ? TabIcons.applications.active
                : TabIcons.applications.inactive;
              break;
            case 'Chat':
              iconConfig = focused
                ? TabIcons.chat.active
                : TabIcons.chat.inactive;
              break;
            case 'Profile':
              iconConfig = focused
                ? TabIcons.profile.active
                : TabIcons.profile.inactive;
              break;
            default:
              iconConfig = TabIcons.applications.inactive;
          }

          return (
            <AppIcon
              name={iconConfig.name}
              library={iconConfig.library}
              size={IconSizes.tab}
              color={focused ? IconColors.active : IconColors.muted}
              active={focused}
            />
          );
        },
        tabBarActiveTintColor: IconColors.active,
        tabBarInactiveTintColor: IconColors.muted,
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
          <AppIcon
            name={TabIcons.applications.inactive.name}
            library="ionicons"
            size={IconSizes.header}
            color={IconColors.bright}
            style={{marginLeft: 16}}
          />
        ),
      })}>
      <Tab.Screen
        name="Applications"
        component={VisaApplicationScreen}
        options={{
          title: t('applications.title'),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: t('chat.aiAssistant'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: t('profile.profile')}}
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
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Questionnaire"
        component={QuestionnaireScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Language"
        component={LanguageScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Security"
        component={SecurityScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          headerShown: false,
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
  const isLoading = useAuthStore(state => state.isLoading);
  const isSignedIn = useAuthStore(state => state.isSignedIn);
  const user = useAuthStore(state => state.user);
  const initializeApp = useAuthStore(state => state.initializeApp);
  const [forceShow, setForceShow] = useState(false);
  // Use separate selectors to avoid getSnapshot warning
  const preferences = useNotificationStore(state => state.preferences);
  const preferencesLoaded = useNotificationStore(
    state => state.preferencesLoaded,
  );
  const loadPreferences = useNotificationStore(state => state.loadPreferences);
  const clearDeviceToken = useNotificationStore(
    state => state.clearDeviceToken,
  );

  // Debug logging - watch for user changes
  useEffect(() => {
    console.log('=== APP.TSX: User state changed ===', {
      isSignedIn,
      hasUser: !!user,
      userId: user?.id,
    });
  }, [isSignedIn, user]);

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
          const authState = useAuthStore.getState();
          if (authState.isLoading) {
            useAuthStore.setState({isLoading: false});
            console.log(
              '=== APP.TSX: Force set isLoading to false after error ===',
            );
          }
        }
      }
    };

    // Add a safety timeout - if initialization takes more than 3 seconds, force continue
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        const authState = useAuthStore.getState();
        if (authState.isLoading) {
          console.warn(
            '=== APP.TSX: Safety timeout - forcing isLoading to false ===',
          );
          useAuthStore.setState({isLoading: false});
        }
      }
    }, 3000);

    initApp();

    // Cleanup function
    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
    };

    // Initialize Firebase (non-blocking)
    // This must happen before any Firebase services are used
    // React Native Firebase auto-initializes from google-services.json
    // We just need to verify it's ready and set up handlers
    initializeFirebase()
      .then(initialized => {
        if (initialized) {
          // Set up background message handler after Firebase is initialized
          setupBackgroundMessageHandler(handleBackgroundNotification).catch(
            error => {
              // Silently fail - background handler is optional
              if (__DEV__) {
                console.warn(
                  '[Firebase] Background message handler setup failed:',
                  error?.message || error,
                );
              }
            },
          );
        } else {
          // Firebase not configured - this is okay, app can work without it
          // Only log in development to avoid console noise
          if (__DEV__) {
            console.info(
              '[Firebase] Firebase not configured. Push notifications will not be available. ' +
                'This is normal if Firebase setup is incomplete.',
            );
          }
        }
      })
      .catch(error => {
        // Silently handle errors - Firebase is optional
        // Only log unexpected errors in development
        if (__DEV__) {
          const errorMessage = error?.message || '';
          // Don't log the expected "no app" error
          if (
            !errorMessage.includes('No Firebase App') &&
            !errorMessage.includes('has been created')
          ) {
            console.warn(
              '[Firebase] Unexpected error during initialization:',
              errorMessage,
            );
          }
        }
        // Continue anyway - Firebase is optional for basic app functionality
      });

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
      loadPreferences().catch(error =>
        logError(error, {
          scope: 'NotificationPreferences',
          message: 'Failed to load notification preferences',
        }),
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
  }, [
    isSignedIn,
    preferencesLoaded,
    preferences.pushNotifications,
    clearDeviceToken,
  ]);

  useEffect(() => {
    // Force show app after 2 seconds max - prevents infinite loading
    const timeout = setTimeout(() => {
      setForceShow(true);
      // Also ensure isLoading is false
      const authState = useAuthStore.getState();
      if (authState.isLoading) {
        console.log(
          '=== APP.TSX: Force timeout - setting isLoading to false ===',
        );
        useAuthStore.setState({isLoading: false});
      }
    }, 2000);
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
            {isSignedIn ? <MainAppStack /> : <AuthStack />}
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
