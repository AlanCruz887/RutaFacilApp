import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoutesScreen from '@screens/RoutesScreen/RoutesScreen';
import RouteDetailsScreen from '@screens/RouteDetailsScreen/RouteDetailsScreen';

const Stack = createNativeStackNavigator();

const RoutesStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true, // Mostrar encabezados para las pantallas
        headerStyle: {
          backgroundColor: '#6200ee', // Color de fondo del encabezado
        },
        headerTintColor: '#fff', // Color del texto y los íconos del encabezado
        headerTitleStyle: {
          fontWeight: 'bold', // Estilo de fuente del título
        },
      }}
    >
      {/* Pantalla de lista de rutas */}
      <Stack.Screen
        name="RoutesScreen"
        component={RoutesScreen}
        options={{
          title: 'Rutas Disponibles', // Título del encabezado
        }}
      />

      {/* Pantalla de detalles de la ruta */}
      <Stack.Screen
        name="RouteDetails"
        component={RouteDetailsScreen}
        options={({ route }) => ({
          title: route.params?.routeName || 'Detalles de la Ruta', // Título dinámico basado en los parámetros
        })}
      />
    </Stack.Navigator>
  );
};

export default RoutesStackNavigator;
