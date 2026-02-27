import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from './constants/theme';
import authService from './services/authService';

// import { NavigationContainer } from '@react-navigation/native';
// import AppNavigator from './navigation/AppNavigator';
// import {AuthProvider} from './context/AuthContext';

// export default function App() {
//   return (
//     <AuthProvider>
//       <NavigationContainer>
//         <AppNavigator />
//       </NavigationContainer>
//     </AuthProvider>
//   );
// }

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    console.log('=== index.tsx handleSignIn called ===');
    console.log('Email:', email);
    console.log('Password length:', password?.length);
    
    if (!email || !password) {
      console.log('Validation failed - empty fields');
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    console.log('Setting loading to true');
    setIsLoading(true);
    try {
        console.log('About to call authService.login');
        const response = await authService.login(email, password);
        console.log('Login response received:', response);
        Alert.alert('Success', 'Valid credentials!', [
            { text: 'OK', onPress: () => router.replace('./screens/tabs/HomeScreen') }
        ]);
        // Reset form
        setEmail('');
        setPassword('');
    } catch (error) {
        console.log('Login failed with error:', error);
        Alert.alert('Error', (error as any)?.detail || 'Failed to sign in');
    } finally {
      console.log('Setting loading to false');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth
    Alert.alert('Google Sign In', 'Google OAuth will be implemented here');
  };

  const handleAppleSignIn = () => {
    // TODO: Implement Apple OAuth
    Alert.alert('Apple Sign In', 'Apple OAuth will be implemented here');
  };

  const handleFacebookSignIn = () => {
    // TODO: Implement Facebook OAuth
    Alert.alert('Facebook Sign In', 'Facebook OAuth will be implemented here');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <MaterialCommunityIcons name="map-marker" size={60} color={Colors.primaryDark} />
          </View>
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue your journey</Text>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => router.push('./screens/ForgotPasswordScreen')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.signInButton}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
                <ActivityIndicator color={Colors.white} />
            ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

           {/* Divider */}
           <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.divider} />
          </View>

          {/* OAuth Buttons */}
          <View style={styles.oauthContainer}>
            <TouchableOpacity 
              style={styles.oauthButton}
              onPress={handleGoogleSignIn}
            >
              <MaterialCommunityIcons name="google" size={24} color="#DB4437" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.oauthButton}
              onPress={handleAppleSignIn}
            >
              <MaterialCommunityIcons name="apple" size={24} color="#000000" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.oauthButton}
              onPress={handleFacebookSignIn}
            >
              <MaterialCommunityIcons name="facebook" size={24} color="#1877F2" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.signUpContainer}
            onPress={() => router.push('./screens/SignUpScreen')}
          >
            <Text style={styles.signUpText}>
              Don't have an account? <Text style={styles.signUpLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoBox: {
    width: 100,
    height: 100,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
    color: Colors.textPrimary,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    color: Colors.white,
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  signInButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.white + '40',
  },
  dividerText: {
    color: Colors.white,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  oauthContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  oauthButton: {
    width: 60,
    height: 60,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  signUpContainer: {
    alignItems: 'center',
  },
  signUpText: {
    color: Colors.white,
    fontSize: 14,
  },
  signUpLink: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});