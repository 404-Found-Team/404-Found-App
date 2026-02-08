import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => router.replace('/')
          /*({
            index: 0,
            routes: [{ name: 'SignIn' }],
          })*/
        },
      ]
    );
  };

  const SettingItem = ({ icon, title, value, onPress, showArrow = true }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Icon name={icon} size={24} color={Colors.textSecondary} />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {showArrow && <Icon name="chevron-right" size={24} color={Colors.textLight} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoButton}>
          <Icon name="map-marker" size={28} color={Colors.primaryDark} />
        </View>
        
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="menu" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => {}}
          >
            <Icon name="cog" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('./MyAccountScreen')}
          >
            <Icon name="account" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your app preferences</Text>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          
          <View style={styles.settingsGroup}>
            <SettingItem 
              icon="bell" 
              title="Notifications" 
              onPress={() => {}} 
            />
            
            <SettingItem 
              icon="map-marker" 
              title="Location Services" 
              onPress={() => {}} 
            />
            
            <SettingItem 
              icon="web" 
              title="Language" 
              value="English"
              onPress={() => {}} 
            />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Icon name="moon-waning-crescent" size={24} color={Colors.textSecondary} />
                <Text style={styles.settingTitle}>Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={darkMode ? Colors.white : Colors.backgroundGray}
              />
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          
          <View style={styles.settingsGroup}>
            <SettingItem 
              icon="shield-check" 
              title="Privacy & Security" 
              onPress={() => {}} 
            />
            
            <SettingItem 
              icon="help-circle" 
              title="Help & Support" 
              onPress={() => {}} 
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          
          <View style={styles.settingsGroup}>
            <View style={styles.aboutItem}>
              <Text style={styles.aboutLabel}>Version</Text>
              <Text style={styles.aboutValue}>1.0.0</Text>
            </View>
            
            <View style={styles.aboutItem}>
              <Text style={styles.aboutLabel}>Build</Text>
              <Text style={styles.aboutValue}>2024.01.30</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Icon name="logout" size={20} color={Colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logoButton: {
    width: 50,
    height: 50,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  titleSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  settingsGroup: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  settingValue: {
    fontSize: 14,
    color: Colors.textLight,
    marginRight: Spacing.sm,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  aboutLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  aboutValue: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    margin: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.danger,
  },
});