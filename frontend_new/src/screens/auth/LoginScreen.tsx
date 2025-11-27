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
  ImageBackground,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuthStore} from '../../store/auth';
import {signInWithGoogle} from '../../services/google-oauth';
import KetdikLogo from '../../assets/ketdik-icon.png.jpg';

const {width, height} = Dimensions.get('window');

export default function LoginScreen({navigation}: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const login = useAuthStore(state => state.login);
  const loginWithGoogle = useAuthStore(state => state.loginWithGoogle);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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
        Alert.alert(
          'Google Login Failed',
          error.message || 'An error occurred',
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
              source={KetdikLogo}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Ketdik</Text>
            <Text style={styles.subtitle}>
              Your trusted digital visa companion.
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
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
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  disabled={loading}>
                  <Text style={styles.forgotPassword}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <Icon
                  name="lock-closed-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
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

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.signInButtonText}>Sign in</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading}>
              <Icon name="logo-google" size={20} color="#FFFFFF" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Create Account Link */}
            <View style={styles.createAccountContainer}>
              <Text style={styles.createAccountText}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                disabled={loading}>
                <Text style={styles.createAccountLink}>Create account</Text>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPassword: {
    fontSize: 13,
    color: '#4A9EFF',
    fontWeight: '500',
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
  signInButton: {
    marginTop: 8,
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
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    gap: 12,
    marginBottom: 24,
  },
  googleButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createAccountText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  createAccountLink: {
    fontSize: 14,
    color: '#4A9EFF',
    fontWeight: '600',
  },
});
