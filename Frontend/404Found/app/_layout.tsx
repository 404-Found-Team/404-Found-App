// import React from 'react';
// import { Stack } from "expo-router";

// export default function RootLayout() {
//   return (
//     <Stack>
//       <Stack.Screen name="index" options={{ headerShown: false}} />
//       <Stack.Screen name="HomeScreen" options={{ title: 'Home Page' }} />
//     </Stack>
//   );
// } 


// import { Tabs } from 'expo-router';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import { Platform } from 'react-native';
// import { Colors } from './constants/theme';

// export default function TabLayout() {
//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: Colors.primary,
//         tabBarInactiveTintColor: Colors.iconInactive,
//         tabBarStyle: {
//           position: 'absolute',
//           bottom: 0,
//           left: 0,
//           right: 0,
//           backgroundColor: Colors.white,
//           borderTopWidth: 1,
//           borderTopColor: Colors.border,
//           height: Platform.OS === 'ios' ? 85 : 70,
//           paddingBottom: Platform.OS === 'ios' ? 25 : 10,
//           paddingTop: 10,
//           elevation: 8,
//           shadowColor: Colors.black,
//           shadowOffset: { width: 0, height: -2 },
//           shadowOpacity: 0.1,
//           shadowRadius: 3,
//         },
//         tabBarLabelStyle: {
//           fontSize: 12,
//           fontWeight: '500',
//         },
//         tabBarItemStyle: {
//           paddingVertical: 5,
//         },
//       }}

//     >
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: 'Home',
//           tabBarIcon: ({ color, size }) => (
//             <MaterialCommunityIcons name="home" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="transit"
//         options={{
//           title: 'Transit',
//           tabBarIcon: ({ color, size }) => (
//             <MaterialCommunityIcons name="train" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="parking"
//         options={{
//           title: 'Parking',
//           tabBarIcon: ({ color, size }) => (
//             <MaterialCommunityIcons name="parking" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="routes"
//         options={{
//           title: 'Routes',
//           tabBarIcon: ({ color, size }) => (
//             <MaterialCommunityIcons name="routes" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="alerts"
//         options={{
//           title: 'Alerts',
//           tabBarIcon: ({ color, size }) => (
//             <MaterialCommunityIcons name="alert" size={size} color={color} />
//           ),
//         }}
//       />
//     </Tabs>

    
//   );
// }



// import { Stack } from 'expo-router';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';

// export default function RootLayout() {
//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <Stack
//         screenOptions={{
//           headerShown: false,
//         }}
//       >
//         {/* Auth screens - no tabs */}
//         <Stack.Screen name="index" />
//         <Stack.Screen name="sign-up" />
//         <Stack.Screen name="forgot-password" />
        
//         {/* Main app with tabs */}
//         <Stack.Screen name="(tabs)" />
        
//         {/* Modal screens - accessible from tabs */}
//         <Stack.Screen 
//           name="settings" 
//           options={{
//             presentation: 'modal',
//           }}
//         />
//         <Stack.Screen 
//           name="my-account" 
//           options={{
//             presentation: 'modal',
//           }}
//         />
//       </Stack>
//     </GestureHandlerRootView>
//   );
// }



import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { Colors } from './constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.iconInactive,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
          elevation: 8,
          shadowColor: Colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
      }}
    >
    
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transit"
        options={{
          title: 'Transit',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="train" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="parking"
        options={{
          title: 'Parking',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="parking" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: 'Routes',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="routes" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="alert" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
