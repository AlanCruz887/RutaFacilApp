import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = 'http://192.168.1.67:3000/api/auth';

export const loginUser = async (email: string, password: string): Promise<string> => {
  try {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    const { token } = response.data;
    return token;
  } catch (error: any) {
    throw new Error(error.response?.data?.message + 'jhj' || 'Error en la autenticación');
  }
};

export const registerUser = async (
    username: string,
    email: string,
    password: string
  ): Promise<void> => {
    try {
      const response = await axios.post(`${API_URL}/register`, {
        username,
        email,
        password,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Error al registrar al usuario' + error
      );
    }
  };