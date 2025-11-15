import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      {/* Decorative Background Elements */}
      <View style={styles.backgroundPattern}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.line, styles.line1]} />
        <View style={[styles.line, styles.line2]} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Icon name="globe-outline" size={64} color="#4A9EFF" />
        </View>
        <Text style={styles.title}>Ketdik</Text>
        <Text style={styles.subtitle}>Your trusted digital visa companion</Text>
      </View>
      <ActivityIndicator 
        size="large" 
        color="#4A9EFF" 
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1929',
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 40,
  },
});
