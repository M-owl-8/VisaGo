import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import {getApiClient} from '../../services/api';

const services = [
  'AI-powered document checklist',
  'AI document verification',
  'Visa approval chance (percentage)',
  'Personalized feedback',
  'AI support chat',
  '24/7 support',
];

export default function SubscriptionScreen() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      const returnUrl = undefined; // mobile can rely on webhook + app refresh
      const resp = await getApiClient().createSubscriptionCheckout(returnUrl);
      if (!resp.success || !resp.data?.url) {
        throw new Error(resp.error?.message || 'Failed to start checkout');
      }
      await Linking.openURL(resp.data.url);
    } catch (err: any) {
      Alert.alert(
        'Payment Error',
        err.message || 'Unable to start payment. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscribe to Ketdik</Text>
      <Text style={styles.subtitle}>$49/month (≈ 599,000 UZS)</Text>
      <Text style={styles.subtitle}>
        International cards via Stripe. Uzcard/Humo/Payme coming soon.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubscribe}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Pay with international card</Text>
        )}
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What you get</Text>
        {services.map(s => (
          <Text key={s} style={styles.listItem}>
            • {s}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20, backgroundColor: '#0b1225'},
  title: {fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8},
  subtitle: {fontSize: 14, color: '#d1d5db', marginBottom: 6},
  button: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 12,
  },
  buttonText: {color: '#fff', fontWeight: '600'},
  card: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  cardTitle: {color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8},
  listItem: {color: '#e5e7eb', marginVertical: 4},
});
