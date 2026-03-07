import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import tokenService from '../services/tokenService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if the user is signed in on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await tokenService.getToken(); // Check if a token exists
        setIsSignedIn(!!token); // Set isSignedIn to true if a token exists
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsSignedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      await tokenService.storeToken(response.access_token); // Store the token
      setIsSignedIn(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      await tokenService.clearTokens(); // Clear the token
      setIsSignedIn(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ isSignedIn, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};