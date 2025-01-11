import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import axios from 'axios';
import { GOOGLE_API_KEY } from '@env';
import api from 'src/services/api';

const GOOGLE_MAPS_API_KEY = GOOGLE_API_KEY; // Reemplaza con tu clave API de Google Maps

const HomeScreen: React.FC = ({ navigation }: any) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedStop, setSelectedStop] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<MapView | null>(null);

  const routeColors = ['#FF0000', '#00FF00', '#0000FF', '#FFA500', '#800080', '#00FFFF'];

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'No se puede acceder a tu ubicación.');
        return;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (currentLocation) => {
          setLocation(currentLocation);
          mapRef.current?.animateCamera({
            center: {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            },
          });
        }
      );

      return () => subscription.remove();
    })();
  }, []);

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

  const handleExploreRoutesPress = async () => {
    if (!location) {
      Alert.alert('Ubicación no disponible', 'Activa la ubicación para buscar rutas cercanas.');
      return;
    }

    setLoading(true);
    try {
      const { latitude, longitude } = location.coords;
      const response = await api.post('/routes/get-nearby-routes', {
        lat: latitude,
        lon: longitude,
      });

      if (response.data.success) {
        const fetchedRoutes = response.data.data;

        const routesWithPolylines = await Promise.all(
          fetchedRoutes.map(async (route: any) => {
            const polyline = await fetchRoutePolyline(route.stops);
            return { ...route, polyline };
          })
        );

        setRoutes(routesWithPolylines);
      } else {
        Alert.alert('Error', response.data.message || 'No se encontraron rutas cercanas.');
      }
    } catch (err) {
      console.error('Error en Axios:', err);
      Alert.alert('Error', 'Hubo un problema al obtener las rutas cercanas.');
    } finally {
      setLoading(false);
    }
  };

  const handleMyLocationPress = () => {
    if (location && mapRef.current) {
      const { latitude, longitude } = location.coords;
      mapRef.current.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
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
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text>Cargando rutas cercanas...</Text>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.title}>RutaFácil</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: 20.17427,
            longitude: -98.04875,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.pointMarker} />
            </Marker>
          )}

          {routes.map((route, index) => {
            const color = routeColors[index % routeColors.length];
            return (
              <React.Fragment key={route.route_id}>
                {route.polyline && (
                  <Polyline coordinates={route.polyline} strokeColor={color} strokeWidth={3} />
                )}
                {route.stops.map((stop: any) => (
                  <Marker
                    key={stop.stop_id}
                    coordinate={{
                      latitude: parseFloat(stop.latitude),
                      longitude: parseFloat(stop.longitude),
                    }}
                    onPress={() => setSelectedStop({ ...stop, route_id: route.route_id })}
                  />
                ))}
              </React.Fragment>
            );
          })}
        </MapView>
      </View>

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

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleExploreRoutesPress}>
          <Ionicons name="map-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>Explorar Rutas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleMyLocationPress}>
          <Ionicons name="navigate-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>Mi Ubicación</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    paddingTop: Platform.OS === 'ios' ? Constants.statusBarHeight : 0,
  },
  header: {
    backgroundColor: '#6200ee',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  title: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pointMarker: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#6200ee',
    borderWidth: 2,
    borderColor: '#fff',
  },
  infoBox: {
    position: 'absolute',
    top: 140,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
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
  actionsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 30,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  actionText: {
    marginLeft: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 2,
  },
});


export default HomeScreen;
