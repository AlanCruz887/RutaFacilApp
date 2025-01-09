import React from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';

const VehicleMarker: React.FC = ({ coordinate }: any) => {
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 1 }}>
      <View style={{ alignItems: 'center' }}>
        <Ionicons name="car" size={40} color="blue" />
      </View>
    </Marker>
  );
};

export default VehicleMarker;
