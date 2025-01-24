import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../../services/AuthContext';
import api from 'src/services/api';

const ProfileScreen: React.FC = ({ navigation }: any) => {
  const { isAuthenticated, logout, token, loading: authLoading } = useAuth(); // Incluir estado de carga
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return; // Esperar a que se cargue el estado de autenticación

    if (!isAuthenticated) {
      navigation.replace('Login');
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await api.get('/users/get-user/', {
          headers: {
            'x-access-token': token,
          },
        });

        if (response.data.success) {
          setUserProfile(response.data.data);
        } else {
          setError(response.data.message || 'Error al obtener los datos del usuario');
        }
      } catch (err: any) {
        setError(err.message || 'Error al realizar la petición');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [isAuthenticated, authLoading, navigation, token]);

  if (authLoading || loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text>Cargando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Cuenta</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.profileContainer}>
          <Text style={styles.profileTitle}>Perfil de Usuario</Text>

          <View style={styles.profileImageContainer}>
            {userProfile.profileImage ? (
              <Image source={{ uri: userProfile.profileImage }} style={styles.profileImage} />
            ) : (
              <Ionicons name="person-circle-outline" size={80} color="#6200ee" />
            )}
          </View>

          <View style={styles.profileCard}>
            <Text style={styles.cardTitle}>Nombre de Usuario</Text>
            <Text style={styles.cardValue}>{userProfile.username}</Text>
          </View>

          <View style={styles.profileCard}>
            <Text style={styles.cardTitle}>Correo Electrónico</Text>
            <Text style={styles.cardValue}>{userProfile.email}</Text>
          </View>

          <View style={styles.profileCard}>
            <Text style={styles.cardTitle}>Estado de la Cuenta</Text>
            <Text style={styles.cardValue}>{userProfile.status}</Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'ios' ? Constants.statusBarHeight : 0,
  },
  header: {
    backgroundColor: '#6200ee',
    paddingVertical: 20,
    borderRadius: 10,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  profileContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  profileTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  profileCard: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 16,
    color: '#6200ee',
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 16,
    color: '#333',
    marginVertical: 5,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
    justifyContent: 'center',
  },
  logoutText: {
    color: '#fff',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default ProfileScreen;
