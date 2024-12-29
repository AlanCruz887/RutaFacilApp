import React from 'react';
import { View, Text, useColorScheme, StyleSheet } from 'react-native';

const TestColorScheme: React.FC = () => {
  const colorScheme = useColorScheme(); // Devuelve "light" o "dark"

  return (
    <View style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }]}>
      <Text style={[styles.text, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
        Esquema actual: {colorScheme}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
  },
});

export default TestColorScheme;
