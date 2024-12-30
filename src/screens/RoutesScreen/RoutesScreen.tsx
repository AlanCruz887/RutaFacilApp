import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '@env';

const RoutesScreen: React.FC = ({ navigation }: any) => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await axios.get(API_URL+'/routes/get-routes');
        if (response.data.success) {
          setRoutes(response.data.data); // Guardar las rutas en el estado
        } else {
          setError(response.data.message || 'Error al obtener las rutas');
        }
      } catch (err: any) {
        setError(err.message || 'Error al realizar la petición');
      } finally {
        setLoading(false); // Detener el indicador de carga
      }
    };

    fetchRoutes();
  }, []);

  const handleViewInMap = (routeId: number) => {
    navigation.navigate('RouteDetails', { routeId }); // Navega a la pantalla RouteDetailsScreen con el ID de la ruta
  };
  

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.routeCard}>
      <Text style={styles.routeName}>{item.route_name}</Text>
      <Text style={styles.routeDetails}>
        Inicio: {item.nombreInicio || 'Nombre no disponible'}
      </Text>
      <Text style={styles.routeDetails}>
        Fin: {item.nombreFinal || 'Nombre no disponible'}
      </Text>
      <TouchableOpacity
        style={styles.viewInMapButton}
        onPress={() => handleViewInMap(item.route_id)}
      >
        <Ionicons name="map-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text>Cargando rutas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={routes}
        keyExtractor={(item) => item.route_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

export default RoutesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 30, // Espaciado desde la parte superior
    marginBottom: 40, // Espaciado entre el título y la lista
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: 'relative', // Necesario para posicionar el botón en relación con la tarjeta
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  routeDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  viewInMapButton: {
    position: 'absolute',
    bottom: 10, // Separación desde la parte inferior de la tarjeta
    right: 10, // Separación desde el lado derecho de la tarjeta
    backgroundColor: '#6200ee',
    borderRadius: 50,
    padding: 10,
    elevation: 5,
  },
});
