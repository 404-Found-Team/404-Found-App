import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../context/AuthContext';

import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MyAccountScreen from '../screens/MyAccountScreen';
import BottomTabNavigator from './Bottomtabnavigator';


const Stack = createStackNavigator();

const AppNavigator = () => {
  //const { isSignedIn, loading } = useContext(AuthContext);

  //if (loading) {
    // Maybe add a load screen while checking auth status
   // return null;
  //}

  return (
    // <NavigationContainer>
      <Stack.Navigator 
        // initialRouteName= {isSignedIn ? "MainApp" : "SignIn"}
        // screenOptions={{
        //   headerShown: false,
        // }}
      >
        {/* {!isSignedIn ? (
          <> */}
            {/* <Stack.Screen name="SignIn" component={SignInScreen} /> */}
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          {/* </>
        ) : ( */}
        <Stack.Screen name="MainApp" component={BottomTabNavigator} />
        {/* )} */}
        {/* <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen 
          name="MyAccount" 
          component={MyAccountScreen}
          options={{ presentation: 'modal' }}
        /> */}
      </Stack.Navigator>
    // </NavigationContainer>
  );
};

export default AppNavigator;