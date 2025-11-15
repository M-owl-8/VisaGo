import React, { useState } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/auth';
import { signInWithGoogle } from '../../services/google-oauth';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const register = useAuthStore((state) => state.register);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to the Terms & Conditions and Privacy Policy');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      // Split full name into first and last name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];
      
      await register(email, password, firstName, lastName);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      const googleUserInfo = await signInWithGoogle();
      await loginWithGoogle(
        googleUserInfo.googleId,
        googleUserInfo.email,
        googleUserInfo.firstName,
        googleUserInfo.lastName,
        googleUserInfo.avatar
      );
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        Alert.alert('Google Sign Up Failed', error.message || 'An error occurred');
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo and Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Icon name="globe-outline" size={48} color="#4A9EFF" />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start your visa application journey.</Text>
          </View>

          {/* Register Card */}
          <View style={styles.card}>
            {/* Full Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Icon name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
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
                <Icon name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
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
                <Icon name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
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
                  style={styles.eyeIcon}
                >
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
              disabled={loading}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && <Icon name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxText}>
                I agree with the{' '}
                <Text style={styles.linkText}>Terms & Conditions</Text> and{' '}
                <Text style={styles.linkText}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.createAccountButton, loading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.createAccountButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Privacy Notice */}
            <View style={styles.privacyNotice}>
              <Icon name="shield-checkmark-outline" size={20} color="#4A9EFF" />
              <Text style={styles.privacyText}>
                We protect your data. Your information is encrypted and never shared.
              </Text>
            </View>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                disabled={loading}
              >
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
    transform: [{ rotate: '15deg' }],
  },
  line2: {
    width: 2,
    height: 250,
    bottom: 150,
    right: '25%',
    transform: [{ rotate: '-15deg' }],
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
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.3)',
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
});
