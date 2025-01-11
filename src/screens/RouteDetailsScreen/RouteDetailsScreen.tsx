import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Alert,
  Dimensions,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { WS_URL, GOOGLE_API_KEY } from "@env";
import { Modal, TextInput, Button } from "react-native";
import * as Notifications from "expo-notifications";
import api from "src/services/api";

const GOOGLE_MAPS_API_KEY = GOOGLE_API_KEY;

const RouteDetailsScreen: React.FC = ({ route }: any) => {
  const { routeId } = route.params;
  const [routeDetails, setRouteDetails] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showVehicles, setShowVehicles] = useState(false);
  const [noVehiclesMessage, setNoVehiclesMessage] = useState<string | null>(
    null
  );
  const [selectedVehicleLocation, setSelectedVehicleLocation] =
    useState<any>(null);
  const [focusedVehicleId, setFocusedVehicleId] = useState<number | null>(null);
  const [waitingForLocation, setWaitingForLocation] = useState<boolean>(false);
  const mapRef = useRef<MapView | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [notificationTime, setNotificationTime] = useState<number | null>(null);
  const [currentVehicleId, setCurrentVehicleId] = useState<number | null>(null);

  useEffect(() => {
    const fetchRouteDetails = async () => {
      try {
        const response = await api.get("/routes/get-route/" + routeId);
        if (response.data.success) {
          const data = response.data.data;
          setRouteDetails(data);
          await fetchRoutePolyline(data.stops);
        } else {
          Alert.alert(
            "Error",
            response.data.message || "Error al obtener los detalles de la ruta"
          );
        }
      } catch (err: any) {
        console.error(err.message || "Error al realizar la petición");
      } finally {
        setLoading(false);
      }
    };

    fetchRouteDetails();
  }, [routeId]);

  useEffect(() => {
    let ws: WebSocket | null = null;

    if (focusedVehicleId) {
      setWaitingForLocation(true); // Mostrar "Cargando" al suscribirse
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log("WebSocket conectado");

        if (ws) {
          ws.send(
            JSON.stringify({
              type: "subscribe",
              vehicle_id: focusedVehicleId,
            })
          );
          console.log(`Suscrito al vehículo: ${focusedVehicleId}`);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.success && message.data) {
            const { lat, lon, vehicle_id } = message.data;

            if (vehicle_id === focusedVehicleId) {
              const newLocation = {
                lat: parseFloat(lat),
                lon: parseFloat(lon),
                vehicleId: vehicle_id,
              };
              setSelectedVehicleLocation(newLocation);
              setWaitingForLocation(false); // Ocultar "Cargando"
            }
          } else {
            console.warn(
              "Mensaje recibido, pero no coincide con el formato esperado:",
              message
            );
          }
        } catch (error) {
          console.error("Error al procesar el mensaje del WebSocket:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("Error en WebSocket:", error);
      };

      ws.onclose = () => {
        console.log("WebSocket desconectado");
      };

      setSocket(ws);
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [focusedVehicleId]);

  const fetchRoutePolyline = async (stops: any[]) => {
    const origin = `${stops[0].latitude},${stops[0].longitude}`;
    const destination = `${stops[stops.length - 1].latitude},${stops[stops.length - 1].longitude}`;
    const waypoints = stops
      .slice(1, -1)
      .map((stop) => `${stop.latitude},${stop.longitude}`)
      .join("|");

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:false|${waypoints}&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.routes.length) {
        const points = decodePolyline(
          response.data.routes[0].overview_polyline.points
        );
        setRouteCoordinates(points);
      } else {
        console.error("No se pudo calcular la ruta.");
      }
    } catch (error) {
      console.error("Error al calcular la ruta:", error);
    }
  };

  const fetchVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const response = await api.get(
        "/vehicles/get-vehicles-by-route/" + routeId
      );
      if (response.data.success) {
        const vehiclesData = response.data.data;
        if (vehiclesData.length === 0) {
          setNoVehiclesMessage("No hay vehículos disponibles para esta ruta.");
        } else {
          setVehicles(vehiclesData);
          setNoVehiclesMessage(null);
        }
        setShowVehicles(true);
      } else {
        Alert.alert(
          "Error",
          "No se pudieron obtener los vehículos disponibles."
        );
      }
    } catch (error) {
      console.error("Error al obtener los vehículos:", error);
      Alert.alert("Error", "Hubo un problema al obtener los vehículos.");
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleSelectVehicle = (vehicleId: number) => {
    setFocusedVehicleId(vehicleId);
  };

  const decodePolyline = (encoded: string) => {
    let points = [];
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

  const allowNotifications = async (
    vehicle_id: number,
    delay: number = 120000
  ): Promise<void> => {
    try {
      // Verificar y solicitar permisos para notificaciones
      console.log(delay)
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        const { status: newStatus } =
          await Notifications.requestPermissionsAsync();
        status = newStatus; // Actualizar el estado después de solicitar
      }

      if (status !== "granted") {
        console.log("Permiso para notificaciones no concedido.");
        return;
      }

      // Obtener el token de Expo Push
      const { data: token } = await Notifications.getExpoPushTokenAsync();

      // Crear el cuerpo de la solicitud para crear la notificación
      const createBody = {
        vehicle_id: vehicle_id,
        push_token: token,
      };

      // Intentar crear la notificación
      await api.post("notifications/create-notification", createBody);
      console.log("Notificación registrada exitosamente.");

      // Programar la actualización de status_active a "no" después de un tiempo
      setTimeout(async () => {
        try {
          const updateBody = {
            vehicle_id: vehicle_id,
            status_active: "no",
          };

          const updateResponse = await api.put(
            "/notifications/update-notification",
            updateBody
          );

          if (updateResponse.data.success) {
            console.log("Notificación desactivada exitosamente.");
          } else {
            console.error(
              "Error al desactivar la notificación:",
              updateResponse.data.message
            );
          }
        } catch (updateError: any) {
          console.error(
            "Error al procesar la desactivación de la notificación:",
            updateError.response?.data?.message || updateError.message
          );
        }
      }, delay); // Tiempo en milisegundos (por defecto 120000 = 2 minutos)
    } catch (error: any) {
      // Manejar el error si ya está registrada (HTTP 409)
      if (error.response?.status === 409) {
        try {
          // Crear el cuerpo de la solicitud para actualizar la notificación
          const updateBody = {
            vehicle_id: vehicle_id,
            status_active: "yes",
          };

          // Hacer la solicitud PUT para actualizar la notificación
          const updateResponse = await api.put(
            "/notifications/update-notification",
            updateBody
          );

          if (updateResponse.data.success) {
            console.log("Notificación actualizada exitosamente.");

            // Programar la desactivación después de un tiempo
            setTimeout(async () => {
              try {
                const disableBody = {
                  vehicle_id: vehicle_id,
                  status_active: "no",
                };

                const disableResponse = await api.put(
                  "/notifications/update-notification",
                  disableBody
                );

                if (disableResponse.data.success) {
                  console.log("Notificación desactivada exitosamente.");
                } else {
                  console.error(
                    "Error al desactivar la notificación:",
                    disableResponse.data.message
                  );
                }
              } catch (disableError: any) {
                console.error(
                  "Error al procesar la desactivación de la notificación:",
                  disableError.response?.data?.message || disableError.message
                );
              }
            }, delay); // Tiempo en milisegundos
          } else {
            console.error(
              "Error al actualizar la notificación:",
              updateResponse.data.message
            );
          }
        } catch (updateError: any) {
          console.error(
            "Error al procesar la actualización de la notificación:",
            updateError.response?.data?.message || updateError.message
          );
        }
      } else {
        // Manejar otros errores
        console.error(
          "Error al procesar la notificación:",
          error.response?.data?.message || error.message
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: parseFloat(routeDetails?.stops[0]?.latitude || 0),
          longitude: parseFloat(routeDetails?.stops[0]?.longitude || 0),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {routeCoordinates && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="red"
            strokeWidth={3}
          />
        )}

        {routeDetails?.stops?.map((stop: any, index: number) => (
          <Marker
            key={index}
            coordinate={{
              latitude: parseFloat(stop.latitude),
              longitude: parseFloat(stop.longitude),
            }}
            title={`Parada ${stop.sequence}`}
          />
        ))}

        {selectedVehicleLocation && (
          <Marker
            coordinate={{
              latitude: selectedVehicleLocation.lat,
              longitude: selectedVehicleLocation.lon,
            }}
            title="Vehículo"
            description={(() => {
              const vehicle = vehicles.find(
                (v) => v.vehicle_id === selectedVehicleLocation.vehicleId
              );
              const model = vehicle?.model || "Modelo no disponible";
              const plate = vehicle?.plate_number || "Placas no disponibles";
              return `${model}\nPlacas: ${plate}`; // Salto de línea con \n
            })()}
          >
            <Ionicons name="car" size={32} color="black" />
          </Marker>
        )}
      </MapView>

      {waitingForLocation && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text>Esperando la ubicación del vehículo...</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.vehicleButton}
        onPress={fetchVehicles}
        disabled={loadingVehicles}
      >
        {loadingVehicles ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="car-outline" size={24} color="#fff" />
            <Text style={styles.vehicleButtonText}>
              Ver Vehículos Disponibles
            </Text>
          </>
        )}
      </TouchableOpacity>

      {showVehicles && (
        <View style={styles.vehicleModal}>
          {noVehiclesMessage ? (
            <Text style={styles.noVehiclesText}>{noVehiclesMessage}</Text>
          ) : (
            <FlatList
              data={vehicles}
              keyExtractor={(item) => item.vehicle_id.toString()}
              renderItem={({ item }) => (
                <View style={styles.vehicleItem}>
                  <Text>{`Modelo: ${item.model}`}</Text>
                  <Text>{`Placas: ${item.plate_number}`}</Text>

                  {/* Botón para Ver Ubicación y Ver Notificaciones */}
                  <View style={styles.buttonContainer}>
                    {/* Botón para Ver Ubicación */}
                    <TouchableOpacity
                      style={styles.locationButton}
                      onPress={() => handleSelectVehicle(item.vehicle_id)}
                    >
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.locationButtonText}>
                        Ver Ubicación
                      </Text>
                    </TouchableOpacity>

                    {/* Botón para Ver Notificaciones */}
                    <TouchableOpacity
                      style={styles.notificationButton}
                      onPress={() => {
                        setCurrentVehicleId(item.vehicle_id); // Guardar el ID del vehículo seleccionado
                        setModalVisible(true); // Mostrar el modal
                      }}
                    >
                      <Ionicons
                        name="notifications-outline"
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.notificationButtonText}>
                        Ver Notificaciones
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}
      <Modal
  animationType="slide"
  transparent={true}
  visible={modalVisible}
  onRequestClose={() => setModalVisible(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>
        Selecciona el tiempo para recibir notificaciones:
      </Text>

      <View style={styles.timeButtonsContainer}>
        {[5, 10, 15, 20].map((time) => (
          <TouchableOpacity
            key={time}
            style={styles.timeButton}
            onPress={() => {
              if (currentVehicleId) {
                allowNotifications(currentVehicleId, time * 60000); // Convertir minutos a ms
                setModalVisible(false);
              }
            }}
          >
            <Text style={styles.timeButtonText}>{time} minutos</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => setModalVisible(false)}
      >
        <Text style={styles.cancelButtonText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


    </View>
  );
};

export default RouteDetailsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleButton: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: "#6200ee",
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleButtonText: { color: "#fff", fontWeight: "bold", marginLeft: 10 },
  vehicleModal: {
    position: "absolute",
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    maxHeight: Dimensions.get("window").height * 0.4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  noVehiclesText: { textAlign: "center", fontWeight: "bold", marginBottom: 10 },
  vehicleItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  locationButton: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6200ee",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  locationButtonText: { color: "#fff", marginLeft: 5 },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  notificationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#03a9f4",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  notificationButtonText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 6,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)", // Fondo más oscuro
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10, // Sombra para Android
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  timeButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    width: "100%",
  },
  timeButton: {
    backgroundColor: "#6200ee",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    margin: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  timeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  cancelButton: {
    marginTop: 20,
    backgroundColor: "#f44336",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  
  
});
