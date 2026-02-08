import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../constants/theme';

export default function MyAccountScreen() {
  const router = useRouter();
  const savedPlaces = [
    { id: '1', name: 'Home', address: '123 Main Street', icon: 'home' },
    { id: '2', name: 'Work', address: 'Langdale Hall', icon: 'briefcase' },
    { id: '3', name: 'Gym', address: '456 Oak Avenue', icon: 'dumbbell' },
  ];

  const recentTrips = [
    { 
      id: '1', 
      from: 'Home', 
      to: 'Langdale Hall', 
      date: 'Today, 8:35 AM',
      icon: 'car'
    },
    { 
      id: '2', 
      from: 'Downtown Station', 
      to: 'Home', 
      date: 'Yesterday, 5:20 PM',
      icon: 'train'
    },
    { 
      id: '3', 
      from: 'Home', 
      to: 'Airport', 
      date: 'Jan 28, 7:15 AM',
      icon: 'car'
    },
  ];

  const stats = [
    { label: 'Trips', value: '127', icon: 'map-marker' },
    { label: 'Hours\nSaved', value: '42', icon: 'clock-outline' },
    { label: 'Miles\nDriven', value: '2,543', icon: 'car' },
  ];

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
            onPress={() => router.push('./SettingsScreen')}
          >
            <Icon name="cog" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => {}}
          >
            <Icon name="account" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Icon name="account" size={60} color={Colors.white} />
          </View>
          <Text style={styles.userName}>John Doe</Text>
          <Text style={styles.userEmail}>john.doe@email.com</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Icon name={stat.icon} size={28} color={Colors.primaryDark} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Saved Places */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Places</Text>
          
          <View style={styles.placesContainer}>
            {savedPlaces.map(place => (
              <TouchableOpacity key={place.id} style={styles.placeCard}>
                <Icon name="map-marker" size={20} color={Colors.textSecondary} />
                <View style={styles.placeInfo}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={styles.placeAddress}>{place.address}</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity style={styles.addPlaceButton}>
              <Icon name="plus" size={20} color={Colors.primary} />
              <Text style={styles.addPlaceText}>Add Place</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Trips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>
          
          <View style={styles.tripsContainer}>
            {recentTrips.map(trip => (
              <TouchableOpacity key={trip.id} style={styles.tripCard}>
                <View style={styles.tripIcon}>
                  <Icon name={trip.icon} size={24} color={Colors.primaryDark} />
                </View>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripRoute}>
                    {trip.from} → {trip.to}
                  </Text>
                  <View style={styles.tripDateRow}>
                    <Icon name="calendar" size={14} color={Colors.textSecondary} />
                    <Text style={styles.tripDate}>{trip.date}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonOutline]}>
            <Text style={[styles.actionButtonText, styles.actionButtonTextOutline]}>
              View All Trips
            </Text>
          </TouchableOpacity>
        </View>
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.white,
    marginTop: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  placesContainer: {
    gap: Spacing.sm,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  addPlaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  addPlaceText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  tripsContainer: {
    gap: Spacing.sm,
  },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  tripIcon: {
    width: 48,
    height: 48,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripInfo: {
    flex: 1,
  },
  tripRoute: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  tripDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  actionsContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  actionButtonOutline: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  actionButtonTextOutline: {
    color: Colors.primary,
  },
});