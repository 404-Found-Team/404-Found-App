import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MyAccountScreen from '../screens/MyAccountScreen';
import BottomTabNavigator from './Bottomtabnavigator';


const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    //<NavigationContainer>
      <Stack.Navigator 
        initialRouteName="SignIn"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="MainApp" component={BottomTabNavigator} />

        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen 
          name="MyAccount" 
          component={MyAccountScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    //</NavigationContainer>
  );
};

export default AppNavigator;