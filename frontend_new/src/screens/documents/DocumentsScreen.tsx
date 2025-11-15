import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function DocumentsScreen() {
  const documents: any[] = [];

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="folder-outline" size={64} color="#DDD" />
      <Text style={styles.emptyTitle}>No Documents</Text>
      <Text style={styles.emptySubtitle}>
        Upload and manage your visa documents here
      </Text>
      <TouchableOpacity style={styles.uploadButton}>
        <Icon name="cloud-upload-outline" size={24} color="#FFF" />
        <Text style={styles.uploadButtonText}>Upload Document</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={documents}
        renderItem={() => null}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#43A047',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});