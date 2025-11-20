import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface PlaceholderProps {
  route: {
    params?: {
      title?: string;
      description?: string;
      icon?: string;
      accent?: string;
    };
  };
  navigation: any;
}

const ProfilePlaceholderScreen = ({route, navigation}: PlaceholderProps) => {
  const {title, description, icon, accent} = route.params || {};

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapper, {backgroundColor: `${accent || '#4A9EFF'}15`}]}>
        <Icon name={icon || 'construct-outline'} size={56} color={accent || '#4A9EFF'} />
      </View>
      <Text style={styles.title}>{title || 'Coming soon'}</Text>
      <Text style={styles.subtitle}>
        {description || 'This section is under construction. Please check back later.'}
      </Text>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={20} color="#FFFFFF" />
        <Text style={styles.backText}>Go back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1929',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrapper: {
    width: 110,
    height: 110,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A9EFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  backText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default ProfilePlaceholderScreen;


