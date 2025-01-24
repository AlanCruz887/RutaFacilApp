import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import axios from 'axios';
import {GOOGLE_API_KEY } from '@env';
import api from 'src/services/api';

const GOOGLE_MAPS_API_KEY = GOOGLE_API_KEY;

const MapScreen: React.FC = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedStop, setSelectedStop] = useState<any | null>(null); // Manejar la parada seleccionada
  const [loading, setLoading] = useState(false);
  const [noRoutesMessage, setNoRoutesMessage] = useState<string | null>(null); // Mensaje "No hay rutas"

  const routeColors = ['#FF0000', '#00FF00', '#0000FF', '#FFA500', '#800080', '#00FFFF']; // Colores para rutas

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
        setNoRoutesMessage(null); // Limpiar mensaje cuando se selecciona una nueva ubicación
      } else if (response.data.status === 204) {
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
      const response = await api.post("routes/get-nearby-routes", {
        lat: location.latitude,
        lon: location.longitude,
      });
      if (response.status === 204) {
        setRoutes([]);
        setNoRoutesMessage('No se encontraron rutas cercanas. Intenta con otra ubicación.');
        alert('No se encontraron rutas cercanas. Intenta con otra ubicación.');
      } else if (response.status === 200 && response.data.success) {
        const routesWithPolylines = await Promise.all(
          response.data.data.map(async (route: any) => {
            const polyline = await fetchRoutePolyline(route.stops);
            return { ...route, polyline };
          })
      );
      setRoutes(routesWithPolylines);      
        setNoRoutesMessage(null); // Limpiar mensaje si hay rutas
      } else {
        Alert.alert('Error', response.data.message || 'No se pudieron obtener rutas cercanas.');
      }
    } catch (error) {
      console.error('Error al buscar rutas cercanas:', error);
      Alert.alert('Error', 'Hubo un problema al buscar rutas cercanas.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutePolyline = async (stops: any[]) => {
    const origin = `${stops[0].latitude},${stops[0].longitude}`;
    const destination = `${stops[stops.length - 1].latitude},${stops[stops.length - 1].longitude}`;
    const waypoints = stops
      .slice(1, -1)
      .map((stop) => `${stop.latitude},${stop.longitude}`)
      .join('|');

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:false|${waypoints}&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.routes.length) {
        return decodePolyline(response.data.routes[0].overview_polyline.points);
      } else {
        console.error('No se pudo calcular la ruta.');
        return [];
      }
    } catch (error) {
      console.error('Error al calcular la ruta:', error);
      return [];
    }
  };

  const decodePolyline = (encoded: string) => {
    let points: any[] = [];
    let index = 0,
      len = encoded.length;
    let lat = 0,
      lng = 0;

    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return points;
  };

  const handleViewRoutePress = () => {
    if (selectedStop) {
      navigation.navigate('Rutas', {
        screen: 'RouteDetails', // Pantalla dentro de RoutesStackNavigator
        params: { routeId: selectedStop.route_id },
      });
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

      {/* Mensaje cuando no hay rutas cercanas */}
      {noRoutesMessage && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{noRoutesMessage}</Text>
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
            coordinate={location}
            title="Ubicación seleccionada"
            description="Esta es tu ubicación elegida."
            pinColor="blue" // Diferenciar del resto de los marcadores
          />
        )}

        {/* Líneas y marcadores de rutas cercanas */}
        {routes.map((route, index) => {
  const color = routeColors[index % routeColors.length];
  return (
    <React.Fragment key={route.route_id}>
      {route.polyline && <Polyline coordinates={route.polyline} strokeColor={color} strokeWidth={3} />}
      {route.stops.map((stop: any) => (
        <Marker
          key={stop.stop_id}
          coordinate={{
            latitude: parseFloat(stop.latitude),
            longitude: parseFloat(stop.longitude),
          }}
          title={`Parada de Ruta ${route.route_name}`}
          description={`ID Ruta: ${route.route_id}`}
          onPress={() => setSelectedStop({ ...stop, route_id: route.route_id })}
        />
      ))}
    </React.Fragment>
  );
})}

      </MapView>

      {/* Detalles de la parada seleccionada */}
      {selectedStop && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>{selectedStop.stop_name}</Text>
          <Text style={styles.infoDescription}>{`Ruta: ${selectedStop.route_id}`}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={handleViewRoutePress} style={styles.routeButton}>
              <Text style={styles.routeButtonText}>Ver Ruta</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedStop(null)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Botón para buscar rutas */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.searchButton} onPress={handleFindRoutesPress}>
          <Text style={styles.searchButtonText}>Buscar rutas cercanas</Text>
        </TouchableOpacity>
      </View>
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
    marginTop: 60,
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
    maxHeight: 170,
    marginTop: 65,
  },
  predictionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
    zIndex: 10,
  },
  messageContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -20 }],
    backgroundColor: '#f8d7da',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  messageText: {
    color: '#721c24',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  infoBox: {
    position: 'absolute',
    top: 180, // Cambiado de bottom: 20 a top: 20 para moverlo a la parte superior
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 10, // Asegura que esté encima del resto del contenido
  },  
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoDescription: {
    fontSize: 14,
    color: '#555',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  routeButton: {
    flex: 1,
    backgroundColor: '#6200ee',
    padding: 10,
    marginRight: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  routeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#d9534f',
    padding: 10,
    marginLeft: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: '25%',
    right: '25%',
  },
  searchButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 90,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
