import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useIsAdmin} from '../../hooks/useIsAdmin';
import {adminApi, UserData} from '../../services/adminApi';

const AdminUsersScreen: React.FC<any> = ({navigation}) => {
  const isAdmin = useIsAdmin();
  const nav = useNavigation();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRole, setNewRole] = useState<string>('');

  // Screen-level guard
  useEffect(() => {
    if (!isAdmin) {
      if (nav.canGoBack()) {
        nav.goBack();
      } else {
        nav.navigate('MainTabs' as never);
      }
    }
  }, [isAdmin, nav]);

  if (!isAdmin) {
    return null;
  }

  useFocusEffect(
    React.useCallback(() => {
      setPage(0);
      setUsers([]);
      fetchUsers(0);
    }, []),
  );

  const fetchUsers = async (pageNum: number) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
      }
      const response = await adminApi.getUsers({
        skip: pageNum * 20,
        take: 20,
      });
      if (pageNum === 0) {
        setUsers(response.data);
      } else {
        setUsers(prev => [...prev, ...response.data]);
      }
      setHasMore(response.data.length === 20);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    setUsers([]);
    await fetchUsers(0);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUsers(nextPage);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await adminApi.updateUserRole(userId, role);
      setUsers(prev => prev.map(u => (u.id === userId ? {...u, role} : u)));
      setModalVisible(false);
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  if (loading && users.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  const renderUserItem = ({item}: {item: UserData}) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => {
        setSelectedUser(item);
        setNewRole(item.role);
        setModalVisible(true);
      }}>
      <View style={styles.userCardHeader}>
        <View>
          <Text style={styles.userName}>
            {item.firstName || item.lastName
              ? `${item.firstName} ${item.lastName}`.trim()
              : 'Unknown'}
          </Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <View
          style={[
            styles.roleBadge,
            {backgroundColor: getRoleColor(item.role)},
          ]}>
          <Text style={styles.roleBadgeText}>{item.role.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.userStats}>
        <StatItem label="Applications" value={item.applicationCount} />
        <StatItem label="Documents" value={item.documentCount} />
        <StatItem label="Spent" value={`$${item.totalSpent.toFixed(2)}`} />
      </View>
      <Text style={styles.joinDate}>
        Joined: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Users Management</Text>
        <Text style={styles.subtitle}>{users.length} users</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={renderUserItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListFooterComponent={() =>
          loading && users.length > 0 ? (
            <ActivityIndicator
              size="small"
              color="#007AFF"
              style={styles.loadMoreIndicator}
            />
          ) : null
        }
      />

      {/* Role Change Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change User Role</Text>
            <Text style={styles.modalSubtitle}>{selectedUser?.email}</Text>

            {['user', 'admin', 'super_admin'].map(role => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleOption,
                  newRole === role && styles.roleOptionSelected,
                ]}
                onPress={() => setNewRole(role)}>
                <View
                  style={[
                    styles.roleRadio,
                    newRole === role && styles.roleRadioSelected,
                  ]}
                />
                <Text style={styles.roleOptionText}>
                  {role.charAt(0).toUpperCase() +
                    role.slice(1).replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() =>
                selectedUser && handleRoleChange(selectedUser.id, newRole)
              }>
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const StatItem = ({label, value}: {label: string; value: string | number}) => (
  <View style={styles.statItem}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const getRoleColor = (role: string) => {
  switch (role) {
    case 'super_admin':
      return '#FF3B30';
    case 'admin':
      return '#FF9500';
    default:
      return '#34C759';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  userStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    paddingRight: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  joinDate: {
    fontSize: 12,
    color: '#999',
  },
  loadMoreIndicator: {
    marginVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  roleOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  roleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999',
    marginRight: 12,
  },
  roleRadioSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  roleOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
});

export default AdminUsersScreen;
