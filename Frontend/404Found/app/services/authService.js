import axios from 'axios';
import tokenService from './tokenService';

const API_BASE_URL = 'http://10.250.8.149:8000/api/v1'; // Update with your actual backend URL

const authService = {
  signup: async (fullName, email, password, confirmPassword) => {
    try {
      // Split full name into first and last name
      const nameParts = fullName.trim().split(/\s+/);
      const fname = nameParts[0];
      const lname = nameParts.slice(1).join(' ');

      if (!fname || !lname) {
        throw { detail: 'Please enter first and last name' };
      }

      console.log('Attempting signup to:', `${API_BASE_URL}/users/signup`);

      const response = await axios.post(`${API_BASE_URL}/users/signup`, {
        fname: fname,
        lname: lname,
        email: email,
        password: password,
        confirm_password: confirmPassword,
      });

      console.log('Signup successful:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('Signup error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
      });

      const detail = Array.isArray(error.response?.data?.detail)
        ? error.response.data.detail
            .map((item) => item?.msg || 'Validation error')
            .join('\n')
        : error.response?.data?.detail;

      throw {
        detail: detail || error.detail || error.message || 'Network error - Backend may not be running',
      };
    }
  },

  login: async (email, password) => {
    try {
      console.log('Attempting login to:', `${API_BASE_URL}/users/login`);
      
      const response = await axios.post(`${API_BASE_URL}/users/login`, {
        email: email,
        password: password,
      });
      
      console.log('Login successful:', response.data);

      // Keychain functionality not available in Expo Go
      /*
      // Store tokens securely in keychain
      if (response.data.access_token) {
        const userData = {
          user_id: response.data.user_id,
          token_type: response.data.token_type,
        };
        await tokenService.storeToken(
          response.data.access_token,
          userData
        );
      }
      */

      return response.data;
    } catch (error) {
      console.error('Login error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
      });
      
      const detail = Array.isArray(error.response?.data?.detail)
        ? error.response.data.detail
            .map((item) => item?.msg || 'Validation error')
            .join('\n')
        : error.response?.data?.detail;
      
      throw {
        detail: detail || error.message || 'Network error - Backend may not be running',
      };
    }
  },

  logout: async () => {
    try {
      // await tokenService.clearTokens();
      console.log('User logged out successfully');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
};

export default authService;
