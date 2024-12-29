import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '@screens/HomeScreen/HomeScreen';
import MapScreen from '@screens/MapScreen/MapScreen';
import RoutesStackNavigator from '../navigation/RoutesStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';

const Tab = createBottomTabNavigator();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarStyle: styles.tabBar,
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            const routeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
              Inicio: 'home-outline',
              Mapa: 'map-outline',
              Rutas: 'search-outline',
              Cuenta: 'person-outline',
            };

            const scale = new Animated.Value(1);
            if (focused) {
              Animated.spring(scale, {
                toValue: 1.3,
                friction: 3,
                useNativeDriver: true,
              }).start();
            } else {
              Animated.spring(scale, {
                toValue: 1,
                friction: 3,
                useNativeDriver: true,
              }).start();
            }

            return (
              <Animated.View style={{ transform: [{ scale }] }}>
                <Ionicons
                  name={routeIcons[route.name]}
                  size={size || 24}
                  color={color}
                />
              </Animated.View>
            );
          },
          tabBarActiveTintColor: '#6200ee',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Inicio" component={HomeScreen} />
        <Tab.Screen name="Mapa" component={MapScreen} />
        <Tab.Screen name="Rutas" component={RoutesStackNavigator} />
        <Tab.Screen name="Cuenta" component={ProfileStackNavigator} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#333',
    height: 60,
    borderRadius: 30,
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: Platform.OS === 'ios' ? 30 : 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
