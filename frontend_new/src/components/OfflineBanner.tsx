import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNetworkStore} from '../store/network';

export const OfflineBanner: React.FC = () => {
  const isOnline = useNetworkStore(state => state.isOnline);
  const connectionType = useNetworkStore(state => state.connectionType);

  if (isOnline) {
    return null;
  }

  const subtitle = connectionType
    ? `Connection: ${connectionType}`
    : 'Waiting for connection...';

  return (
    <View style={styles.container} testID="offline-banner">
      <Text style={styles.title}>You are currently offline</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={styles.helper}>
        We will automatically sync your actions once you are back online.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#B71C1C',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  subtitle: {
    color: '#FFCDD2',
    fontSize: 12,
    marginTop: 2,
  },
  helper: {
    color: '#FFCDD2',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
});
