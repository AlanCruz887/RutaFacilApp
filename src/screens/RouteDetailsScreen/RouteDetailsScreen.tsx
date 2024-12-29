import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import axios from 'axios';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAENYjyPAeoOfR1GWtwIHC-dY65VCd_V2o'; // Reemplaza con tu clave API de Google Maps

const RouteDetailsScreen: React.FC = ({ route }: any) => {
  const { routeId } = route.params; // Obtener el ID de la ruta desde los parámetros
  const [routeDetails, setRouteDetails] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRouteDetails = async () => {
      try {
        // Petición para obtener los detalles de la ruta
        const response = await axios.get(`http://192.168.1.67:3000/api/routes/get-route/${routeId}`);
        if (response.data.success) {
          const data = response.data.data;
          setRouteDetails(data); // Guardar los detalles de la ruta
          await fetchRoutePolyline(data.stops); // Calcular la polilínea para las calles
        } else {
          setError(response.data.message || 'Error al obtener los detalles de la ruta');
        }
      } catch (err: any) {
        setError(err.message || 'Error al realizar la petición');
      } finally {
        setLoading(false); // Detener el indicador de carga
      }
    };

    fetchRouteDetails();
  }, [routeId]);

  
  const fetchRoutePolyline = async (stops: any[]) => {
    const origin = `${stops[0].latitude},${stops[0].longitude}`; // Punto inicial
    const destination = `${stops[stops.length - 1].latitude},${stops[stops.length - 1].longitude}`; // Punto final
  
    const waypoints = stops
      .slice(1, -1) // Puntos intermedios (excluyendo origen y destino)
      .map((stop) => `${stop.latitude},${stop.longitude}`)
      .join('|'); // Combina los puntos con "|"
  
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:false|${waypoints}&key=${GOOGLE_MAPS_API_KEY}`
      );
  
      if (response.data.routes.length) {
        const points = decodePolyline(response.data.routes[0].overview_polyline.points);
        setRouteCoordinates(points); // Almacenar la ruta decodificada
      } else {
        console.error('No se pudo calcular la ruta.');
      }
    } catch (error) {
      console.error('Error al calcular la ruta:', error);
    }
  };
  
  

  const decodePolyline = (encoded: string) => {
    let points = [];
    let index = 0,
      len = encoded.length;
    let lat = 0,
      lng = 0;

    while (index < len) {
      let b, shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return points;
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text>Cargando detalles de la ruta...</Text>
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
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: parseFloat(routeDetails.stops[0].latitude),
          longitude: parseFloat(routeDetails.stops[0].longitude),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Dibujar la línea de la ruta basada en calles */}
        {routeCoordinates && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="red"
            strokeWidth={3}
          />
        )}

        {/* Dibujar los puntos numerados */}
        {routeDetails.stops.map((stop: any, index: number) => (
          <Marker
            key={index}
            coordinate={{
              latitude: parseFloat(stop.latitude),
              longitude: parseFloat(stop.longitude),
            }}
            title={`Parada ${stop.sequence}`}
            description={`Llegada: ${new Date(stop.arrival_time).toLocaleTimeString()}`}
          >
            <View style={styles.marker}>
              <Text style={styles.markerText}>{stop.sequence}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
};

export default RouteDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
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
  marker: {
    backgroundColor: '#6200ee',
    borderRadius: 15,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center', // Aquí se corrigió el error
  },
  markerText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
