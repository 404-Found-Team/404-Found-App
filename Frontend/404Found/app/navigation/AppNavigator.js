import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../context/AuthContext';

import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MyAccountScreen from '../screens/MyAccountScreen';
// import BottomTabNavigator from './Bottomtabnavigator';


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
            {/* Forgot password is temporarily disabled.
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            */}
          {/* </>
        ) : ( */}
        {/* Main app navigation is now handled by Expo Router's layout.tsx */}
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
