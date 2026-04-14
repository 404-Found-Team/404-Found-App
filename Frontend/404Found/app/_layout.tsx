
// To limit tabs to only the files you want, place your tab screens inside a folder named (tabs) in the app directory.
// Example: app/(tabs)/index.tsx, app/(tabs)/transit.tsx, etc.
// Only files inside (tabs) will become tabs in the bottom navigator.


import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Entry point — sign-in */}
        <Stack.Screen name="index" />
        {/* Auth screens - no tabs */}
        <Stack.Screen name="home" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="forgot-password" />
        {/* Main app with tabs */}
        <Stack.Screen name="(tabs)" />
        {/* Modal screens - accessible from tabs */}
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="my-account" options={{ presentation: 'modal' }} />
        {/* Full-screen navigation overlay */}
        <Stack.Screen name="navigation" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
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