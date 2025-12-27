import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';
import {useAuthStore} from '../../store/auth';
import {signInWithGoogle} from '../../services/google-oauth';

const {width, height} = Dimensions.get('window');

export default function RegisterScreen({navigation}: any) {
  const {t} = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const register = useAuthStore(state => state.register);
  const loginWithGoogle = useAuthStore(state => state.loginWithGoogle);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      // LOW PRIORITY FIX: Use translation system for error messages
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    if (!agreedToTerms) {
      // LOW PRIORITY FIX: Use translation system for error messages
      Alert.alert(t('common.error'), t('auth.agreeToTerms'));
      return;
    }

    // Clear previous error
    setErrorMessage(null);

    // Basic client-side validation (matches backend)
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    if (!/[A-Za-z]/.test(password)) {
      setErrorMessage('Password must contain at least one letter');
      return;
    }

    try {
      setLoading(true);
      // Split full name into first and last name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];

      await register(email, password, firstName, lastName);
      const user = useAuthStore.getState().user;
      if (user?.requiresPayment || user?.subscriptionRequired) {
        navigation.navigate('Subscription');
      } else {
        navigation.navigate('Home');
      }
    } catch (error: any) {
      // Extract error code and message from backend
      const code = error.code || 'UNKNOWN_ERROR';
      const message =
        error.message ||
        "Noma'lum xatolik yuz berdi. Iltimos, qayta urinib ko'ring.";

      // Show localized error message based on code
      let displayMessage = message;

      if (code === 'EMAIL_ALREADY_EXISTS') {
        displayMessage = 'Bu email bilan foydalanuvchi allaqachon mavjud.';
      } else if (code === 'WEAK_PASSWORD') {
        displayMessage =
          "Parol juda oddiy. Iltimos kamida 6 ta belgidan iborat va hech bo'lmaganda bitta harf bo'lsin.";
      } else if (code === 'INVALID_INPUT') {
        displayMessage = "Kiritilgan ma'lumotlar noto'g'ri.";
      }

      setErrorMessage(displayMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      // Get Google ID token from Google Sign-In SDK
      const googleUserInfo = await signInWithGoogle();

      // SECURE: Send idToken to backend for server-side verification
      if (!googleUserInfo.token) {
        throw new Error('No ID token returned from Google Sign-In');
      }

      await loginWithGoogle(googleUserInfo.token);
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        // LOW PRIORITY FIX: Use translation system for error messages
        Alert.alert(
          t('auth.googleSignUpFailed'),
          error.message || t('common.errorOccurred'),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background with gradient effect */}
      <View style={styles.gradientBackground}>
        {/* Decorative Background Elements */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.line, styles.line1]} />
          <View style={[styles.line, styles.line2]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Logo and Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/ketdik-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Start your visa application journey.
            </Text>
          </View>

          {/* Register Card */}
          <View style={styles.card}>
            {/* Full Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Icon
                  name="person-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#6B7280"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Icon
                  name="mail-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="#6B7280"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Icon
                  name="lock-closed-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Create a strong password"
                  placeholderTextColor="#6B7280"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}>
                  <Icon
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms and Conditions Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              disabled={loading}>
              <View
                style={[
                  styles.checkbox,
                  agreedToTerms && styles.checkboxChecked,
                ]}>
                {agreedToTerms && (
                  <Icon name="checkmark" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.checkboxText}>
                I agree with the{' '}
                <Text style={styles.linkText}>Terms & Conditions</Text> and{' '}
                <Text style={styles.linkText}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Error Message */}
            {errorMessage && (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Create Account Button */}
            <TouchableOpacity
              style={[
                styles.createAccountButton,
                loading && styles.disabledButton,
              ]}
              onPress={handleRegister}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.createAccountButtonText}>
                  Create Account
                </Text>
              )}
            </TouchableOpacity>

            {/* Privacy Notice */}
            <View style={styles.privacyNotice}>
              <Icon name="shield-checkmark-outline" size={20} color="#4A9EFF" />
              <Text style={styles.privacyText}>
                We protect your data. Your information is encrypted and never
                shared.
              </Text>
            </View>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                disabled={loading}>
                <Text style={styles.signInLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.1)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -50,
  },
  line: {
    position: 'absolute',
    backgroundColor: 'rgba(74, 158, 255, 0.05)',
  },
  line1: {
    width: 2,
    height: 300,
    top: 100,
    left: '30%',
    transform: [{rotate: '15deg'}],
  },
  line2: {
    width: 2,
    height: 250,
    bottom: 150,
    right: '25%',
    transform: [{rotate: '-15deg'}],
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(74, 158, 255, 0.4)',
    backgroundColor: 'transparent',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A9EFF',
    borderColor: '#4A9EFF',
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
  },
  linkText: {
    color: '#4A9EFF',
    fontWeight: '600',
  },
  createAccountButton: {
    marginBottom: 24,
    borderRadius: 12,
    height: 52,
    backgroundColor: '#3EA6FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A9EFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  createAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 12,
    lineHeight: 18,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  signInLink: {
    fontSize: 14,
    color: '#4A9EFF',
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    marginLeft: 8,
    lineHeight: 18,
  },
});
