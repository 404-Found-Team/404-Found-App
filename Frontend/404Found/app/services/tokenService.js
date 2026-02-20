import * as Keychain from 'react-native-keychain';

const TOKEN_KEY = '404found_access_token';
const REFRESH_TOKEN_KEY = '404found_refresh_token';
const USER_KEY = '404found_user_data';
const TOKEN_TYPE_KEY = '404found_token_type';

const tokenService = {
  /**
   * Store access token securely in device keychain
   * @param {string} accessToken - The access token to store
   * @param {string} refreshToken - Optional refresh token to store
   * @param {object} userData - Optional user data to store (user_id, token_type)
   */
  storeToken: async (accessToken, refreshToken = null, userData = null) => {
    try {
      // Store access token
      await Keychain.setGenericPassword(TOKEN_KEY, accessToken, {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        service: TOKEN_KEY,
      });

      // Store refresh token if provided
      if (refreshToken) {
        await Keychain.setGenericPassword(REFRESH_TOKEN_KEY, refreshToken, {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
          service: REFRESH_TOKEN_KEY,
        });
      }

      // Store user data if provided
      if (userData) {
        await Keychain.setGenericPassword(USER_KEY, JSON.stringify(userData), {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
          service: USER_KEY,
        });

        // Store token type separately for easy access
        if (userData.token_type) {
          await Keychain.setGenericPassword(TOKEN_TYPE_KEY, userData.token_type, {
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
            service: TOKEN_TYPE_KEY,
          });
        }
      }

      console.log('Tokens stored securely in keychain');
      return true;
    } catch (error) {
      console.error('Error storing token:', error);
      throw error;
    }
  },

  /**
   * Retrieve access token from device keychain
   * @returns {Promise<string|null>} - The stored access token or null
   */
  getAccessToken: async () => {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: TOKEN_KEY,
      });

      if (credentials) {
        console.log('Access token retrieved from keychain');
        return credentials.password;
      }

      console.log('No access token found in keychain');
      return null;
    } catch (error) {
      console.error('Error retrieving access token:', error);
      return null;
    }
  },

  /**
   * Retrieve refresh token from device keychain
   * @returns {Promise<string|null>} - The stored refresh token or null
   */
  getRefreshToken: async () => {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: REFRESH_TOKEN_KEY,
      });

      if (credentials) {
        console.log('Refresh token retrieved from keychain');
        return credentials.password;
      }

      console.log('No refresh token found in keychain');
      return null;
    } catch (error) {
      console.error('Error retrieving refresh token:', error);
      return null;
    }
  },

  /**
   * Retrieve user data from device keychain
   * @returns {Promise<object|null>} - The stored user data or null
   */
  getUserData: async () => {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: USER_KEY,
      });

      if (credentials) {
        console.log('User data retrieved from keychain');
        return JSON.parse(credentials.password);
      }

      console.log('No user data found in keychain');
      return null;
    } catch (error) {
      console.error('Error retrieving user data:', error);
      return null;
    }
  },

  /**
   * Clear all stored tokens and user data from keychain
   */
  clearTokens: async () => {
    try {
      await Promise.all([
        Keychain.resetGenericPassword({ service: TOKEN_KEY }),
        Keychain.resetGenericPassword({ service: REFRESH_TOKEN_KEY }),
        Keychain.resetGenericPassword({ service: USER_KEY }),
        Keychain.resetGenericPassword({ service: TOKEN_TYPE_KEY }),
      ]);

      console.log('All tokens cleared from keychain');
      return true;
    } catch (error) {
      console.error('Error clearing tokens:', error);
      throw error;
    }
  },

  /**
   * Check if token exists in keychain
   * @returns {Promise<boolean>} - True if token exists
   */
  hasToken: async () => {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: TOKEN_KEY,
      });

      return !!credentials;
    } catch (error) {
      console.error('Error checking token:', error);
      return false;
    }
  },

  /**
   * Update access token (useful for token refresh)
   * @param {string} newAccessToken - New access token to store
   */
  updateAccessToken: async (newAccessToken) => {
    try {
      await Keychain.setGenericPassword(TOKEN_KEY, newAccessToken, {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        service: TOKEN_KEY,
      });

      console.log('Access token updated in keychain');
      return true;
    } catch (error) {
      console.error('Error updating access token:', error);
      throw error;
    }
  },

  /**
   * Get token type (e.g., 'bearer')
   * @returns {Promise<string|null>} - The stored token type or null
   */
  getTokenType: async () => {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: TOKEN_TYPE_KEY,
      });

      if (credentials) {
        console.log('Token type retrieved from keychain');
        return credentials.password;
      }

      return 'bearer'; // Default to bearer
    } catch (error) {
      console.error('Error retrieving token type:', error);
      return 'bearer'; // Default to bearer
    }
  },

  /**
   * Get user ID from stored data
   * @returns {Promise<number|null>} - The stored user ID or null
   */
  getUserId: async () => {
    try {
      const userData = await tokenService.getUserData();
      return userData?.user_id || null;
    } catch (error) {
      console.error('Error retrieving user ID:', error);
      return null;
    }
  },
};

export default tokenService;
