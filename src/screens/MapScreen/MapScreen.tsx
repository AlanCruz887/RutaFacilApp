import React from 'react';
import { View, Text } from 'react-native';
import styles from './MapScreen.styles';

const MapScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Pantalla de Mapa</Text>
    </View>
  );
};

export default MapScreen;
