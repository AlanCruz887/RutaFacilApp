import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ProfileScreen from '@screens/ProfileScreen/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { ActivityIndicator, View } from 'react-native';

const Stack = createStackNavigator();

const ProfileStackNavigator: React.FC = () => {
  const [initialRoute, setInitialRoute] = useState<string | null>(null); // Guarda la ruta inicial

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        setInitialRoute(token ? 'Profile' : 'Login'); // Si hay token, ir a Profile; si no, a Login
      } catch (error) {
        console.error('Error al verificar el token en AsyncStorage:', error);
        setInitialRoute('Login'); // En caso de error, redirige a Login
      }
    };

    checkToken();
  }, []);

  if (initialRoute === null) {
    // Muestra un indicador de carga mientras se verifica el token
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

export default ProfileStackNavigator;
