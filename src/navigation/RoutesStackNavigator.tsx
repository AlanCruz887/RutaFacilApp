import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoutesScreen from '@screens/RoutesScreen/RoutesScreen';
import RouteDetailsScreen from '@screens/RouteDetailsScreen/RouteDetailsScreen';

const Stack = createNativeStackNavigator();

const RoutesStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RoutesScreen"
        component={RoutesScreen}
        options={{ title: 'Rutas Disponibles' }}
      />
      <Stack.Screen
        name="RouteDetails"
        component={RouteDetailsScreen}
        options={{ title: 'Detalles de la Ruta' }}
      />
      
    </Stack.Navigator>
  );
};

export default RoutesStackNavigator;
