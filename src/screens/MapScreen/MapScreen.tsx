import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import axios from 'axios';
import { API_URL, GOOGLE_API_KEY } from '@env';

const GOOGLE_MAPS_API_KEY = GOOGLE_API_KEY; // Reemplaza con tu clave de Google Maps

const MapScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearchChange = async (text: string) => {
    setSearchQuery(text);

    if (text.length < 3) {
      setPredictions([]);
      return;
    }

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text
        )}&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.status === 'OK') {
        setPredictions(response.data.predictions);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const handlePredictionPress = async (placeId: string) => {
    setLoading(true);

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.status === 'OK') {
        const { lat, lng } = response.data.result.geometry.location;
        setLocation({ latitude: lat, longitude: lng });
        setSearchQuery(response.data.result.formatted_address);
        setPredictions([]);
      } else {
        Alert.alert('Error', 'No se pudo obtener la ubicación del lugar seleccionado.');
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
      Alert.alert('Error', 'Hubo un problema al obtener los detalles del lugar.');
    } finally {
      setLoading(false);
    }
  };

  const handleFindRoutesPress = async () => {
    if (!location) {
      Alert.alert('Error', 'Primero selecciona una ubicación.');
      return;
    }

    setLoading(true);

    try {
      const routesResponse = await axios.post(API_URL+'/routes/get-nearby-routes', {
        lat: location.latitude,
        lon: location.longitude,
      });

      if (routesResponse.data.success) {
        setRoutes(routesResponse.data.data);
      } else {
        Alert.alert('Error', 'No se encontraron rutas cercanas.');
      }
    } catch (error) {
      console.error('Error fetching nearby routes:', error);
      Alert.alert('Error', 'Hubo un problema al buscar rutas cercanas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Cuadro de búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Ingresa una dirección"
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
      </View>

      {/* Predicciones */}
      {predictions.length > 0 && (
        <FlatList
          style={styles.predictionsList}
          data={predictions}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.predictionItem}
              onPress={() => handlePredictionPress(item.place_id)}
            >
              <Text>{item.description}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Indicador de carga */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text>Buscando rutas...</Text>
        </View>
      )}

      {/* Mapa */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 20.17427,
          longitude: -98.04875,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        region={
          location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : undefined
        }
      >
        {/* Marcador de la ubicación seleccionada */}
        {location && (
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title="Ubicación seleccionada"
          />
        )}

        {/* Marcadores de rutas cercanas */}
        {routes.map((route) =>
          route.stops.map((stop: any) => (
            <Marker
              key={stop.stop_id}
              coordinate={{
                latitude: parseFloat(stop.latitude),
                longitude: parseFloat(stop.longitude),
              }}
              title={`Parada de Ruta ${route.route_name}`}
            />
          ))
        )}
      </MapView>

      {/* Botón para buscar rutas (solo si hay ubicación seleccionada) */}
      {location && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.searchButton} onPress={handleFindRoutesPress}>
            <Text style={styles.searchButtonText}>Buscar rutas</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  predictionsList: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    zIndex: 10,
    maxHeight: 150,
  },
  predictionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  buttonContainer: {
    position: 'absolute',
    alignSelf: 'center',
    justifyContent: 'center',
    top: '50%',
    width: '50%',
    zIndex: 10,
  },
  searchButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
    zIndex: 10,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
