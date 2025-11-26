import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  AdminDashboard,
  AdminUsersScreen,
  AdminApplicationsScreen,
  AdminPaymentsScreen,
  AdminDocumentsScreen,
  AdminAnalyticsScreen,
} from '../screens/admin';

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminUsers: undefined;
  AdminApplications: undefined;
  AdminPayments: undefined;
  AdminDocuments: undefined;
  AdminAnalytics: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0A1929',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(74, 158, 255, 0.2)',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 20,
          color: '#FFFFFF',
        },
        headerBackTitleVisible: false,
        contentStyle: {backgroundColor: '#0A1929'},
      }}>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{title: 'Admin Dashboard'}}
      />
      <Stack.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{title: 'Users'}}
      />
      <Stack.Screen
        name="AdminApplications"
        component={AdminApplicationsScreen}
        options={{title: 'Applications'}}
      />
      <Stack.Screen
        name="AdminPayments"
        component={AdminPaymentsScreen}
        options={{title: 'Payments'}}
      />
      <Stack.Screen
        name="AdminDocuments"
        component={AdminDocumentsScreen}
        options={{title: 'Documents'}}
      />
      <Stack.Screen
        name="AdminAnalytics"
        component={AdminAnalyticsScreen}
        options={{title: 'Analytics'}}
      />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
