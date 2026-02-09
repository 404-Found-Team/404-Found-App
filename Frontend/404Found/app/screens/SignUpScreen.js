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
    ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../constants/theme';

export default function SignUpScreen() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSignUp = () => {
        if (!fullName || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
    }

    if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      
      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => router.back('/') } // used to say SignIn 
        // And the .back may cancel any changes that were made when updating sign up.
      ]);
    };

    const handleGoogleSignUp = () => {
        // TODO: Implement Google OAuth
        Alert.alert('Google Sign Up', 'Google OAuth will be implemented here');
      };
    
      const handleAppleSignUp = () => {
        // TODO: Implement Apple OAuth
        Alert.alert('Apple Sign Up', 'Apple OAuth will be implemented here');
      };
    
      const handleFacebookSignUp = () => {
        // TODO: Implement Facebook OAuth
        Alert.alert('Facebook Sign Up', 'Facebook OAuth will be implemented here');
      };    

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.logoContainer}>
                        <View style={styles.logoBox}>
                            <MaterialCommunityIcons name="map-marker" size={60} color={Colors.primaryDark} />
                        </View>
                    </View>

                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Sign up to start navigating</Text>

                    {/* OAuth Buttons */}
                    <View style={styles.oauthContainer}>
                        <TouchableOpacity 
                        style={styles.oauthButton}
                        onPress={handleGoogleSignUp}
                        >
                        <MaterialCommunityIcons name="google" size={24} color="#DB4437" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                        style={styles.oauthButton}
                        onPress={handleAppleSignUp}
                        >
                        <MaterialCommunityIcons name="apple" size={24} color="#000000" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                        style={styles.oauthButton}
                        onPress={handleFacebookSignUp}
                        >
                        <MaterialCommunityIcons name="facebook" size={24} color="#1877F2" />
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.divider} />
                        <Text style={styles.dividerText}>or sign up with email</Text>
                        <View style={styles.divider} />
                    </View>

                    <View style={styles.formContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor={Colors.textLight}
                            value={fullName}
                            onChangeText={setFullName}
                            autoCapitalize="words"
                        />
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

                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            placeholderTextColor={Colors.textLight}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />

                        <TouchableOpacity
                            style={styles.signUpButton}
                            onPress={handleSignUp}
                        >
                            <Text style={styles.signUpButtonText}>Sign Up</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.signInContainer}
                            onPress={() => router.back('/')} // used to say SignIn
                        >
                            <Text style={styles.signInText}>
                                Already have an account? <Text style={styles.signInLink}>Sign In</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
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
    oauthContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.sm,
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
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.md,
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
    signUpButton: {
        backgroundColor: Colors.primaryDark,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    signUpButtonText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '600',
    },
    signInContainer: {
        alignItems: 'center',
    },
    signInText: {
        color: Colors.white,
        fontSize: 14,
    },
      signInLink: {
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});