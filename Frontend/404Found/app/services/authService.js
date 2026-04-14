import axios from 'axios';
import { API_BASE_URL } from '../constants/api';

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
      window.access_token = response.data.access_token;

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
      console.log('Attempting logout to:', `${API_BASE_URL}/users/logout`);
      // Try to get token from tokenService, fallback to window.access_token
      /*
      
      if (tokenService.getAccessToken) {
        accessToken = await tokenService.getAccessToken();
      }
      */

      let accessToken = null;
      
      if (typeof window !== 'undefined') {
        accessToken = window.access_token;
      } else {
        throw new Error('No access token found for logout');
      }
      const response = await axios.post(
        `${API_BASE_URL}/users/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      console.log('Logout successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
};

export const getAccessToken = () => window.access_token;
export default authService;
