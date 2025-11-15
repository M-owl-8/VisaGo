import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

/**
 * Initialize Google Sign-In with Web Client ID
 * Must be called once before any sign-in operations
 * 
 * Web Client ID should be from your Google Cloud Console OAuth 2.0 credentials
 */
export async function initializeGoogleSignIn(webClientId: string): Promise<void> {
  try {
    GoogleSignin.configure({
      webClientId: webClientId,
      offlineAccess: true,
      hostedDomain: '', // Leave empty unless you want to restrict to specific domain
      forceCodeForRefreshToken: true,
      accountName: '', // Leave empty to show account picker
    });
    
    console.log('Google Sign-In initialized successfully');
  } catch (error) {
    console.error('Error initializing Google Sign-In:', error);
    throw new Error('Failed to initialize Google Sign-In');
  }
}

/**
 * Sign in with Google
 * Returns user info including googleId, email, name, and photo
 */
export async function signInWithGoogle() {
  try {
    // Check if device has Google Play Services
    await GoogleSignin.hasPlayServices();

    const userInfo = await GoogleSignin.signIn();

    // Extract user information
    const googleId = userInfo.user.id;
    const email = userInfo.user.email;
    const firstName = userInfo.user.givenName || '';
    const lastName = userInfo.user.familyName || '';
    const avatar = userInfo.user.photo || undefined;

    return {
      googleId,
      email,
      firstName,
      lastName,
      avatar,
      token: userInfo.idToken, // JWT token from Google
    };
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('Sign in was cancelled');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Sign in is already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services is not available');
    } else {
      throw new Error('Google Sign-In failed: ' + (error.message || 'Unknown error'));
    }
  }
}

/**
 * Check if user is currently signed in to Google
 */
export async function isSignedInGoogle(): Promise<boolean> {
  try {
    const isSignedIn = await GoogleSignin.isSignedIn();
    return isSignedIn;
  } catch (error) {
    console.error('Error checking Google sign-in status:', error);
    return false;
  }
}

/**
 * Get current signed-in user info
 */
export async function getCurrentGoogleUser() {
  try {
    const isSignedIn = await GoogleSignin.isSignedIn();
    
    if (!isSignedIn) {
      return null;
    }

    const userInfo = await GoogleSignin.getCurrentUser();
    
    if (!userInfo) {
      return null;
    }

    return {
      googleId: userInfo.user.id,
      email: userInfo.user.email,
      firstName: userInfo.user.givenName || '',
      lastName: userInfo.user.familyName || '',
      avatar: userInfo.user.photo || undefined,
    };
  } catch (error) {
    console.error('Error getting current Google user:', error);
    return null;
  }
}

/**
 * Sign out from Google
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
    console.log('Signed out from Google');
  } catch (error) {
    console.error('Error signing out from Google:', error);
    throw new Error('Failed to sign out from Google');
  }
}

/**
 * Revoke Google Sign-In access (useful when user wants to disconnect Google account)
 */
export async function revokeGoogleAccess(): Promise<void> {
  try {
    await GoogleSignin.revokeAccess();
    console.log('Google Sign-In access revoked');
  } catch (error) {
    console.error('Error revoking Google access:', error);
    throw new Error('Failed to revoke Google access');
  }
}