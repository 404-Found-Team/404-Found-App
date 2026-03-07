import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

export default function ParkingScreen() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState('All');
  const filters = ['All', 'Garages', 'Lots', 'Street'];
  
  const parkingLocations = [
    { id: '1', name: 'G-Deck Parking', type: 'Garage', address: '123 Main St', distance: '0.3 mi', price: '$2.50/hr', available: 45, total: 120 },
    { id: '2', name: 'City Center Lot', type: 'Lot', address: '456 Oak Ave', distance: '0.5 mi', price: '$3.00/hr', available: 12, total: 80 },
  ];

  const getAvailabilityColor = (available, total) => {
    const percentage = (available / total) * 100;
    if (percentage > 50) return Colors.success;
    if (percentage > 20) return Colors.warning;
    return Colors.danger;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.logoButton}>
          <MaterialCommunityIcons name="map-marker" size={28} color={Colors.primaryDark} />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialCommunityIcons name="menu" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('../screens/SettingsScreen')}>
            <MaterialCommunityIcons name="cog" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('../screens/MyAccountScreen')}>
            <MaterialCommunityIcons name="account" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Parking</Text>
          <Text style={styles.subtitle}>Find available parking nearby</Text>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filters.map(filter => (
              <TouchableOpacity key={filter} style={[styles.filterButton, selectedFilter === filter && styles.filterButtonActive]} onPress={() => setSelectedFilter(filter)}>
                <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextActive]}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.locationsContainer}>
          {parkingLocations.map(location => (
            <View key={location.id} style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <View style={styles.parkingIcon}>
                  <MaterialCommunityIcons name="parking" size={32} color={Colors.primaryDark} />
                </View>
                <View style={styles.locationInfo}>
                  <View style={styles.locationTitleRow}>
                    <Text style={styles.locationName}>{location.name}</Text>
                    <Text style={styles.distance}>{location.distance}</Text>
                  </View>
                  <Text style={styles.locationType}>{location.type}</Text>
                  <View style={styles.addressRow}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={Colors.textSecondary} />
                    <Text style={styles.address}>{location.address}</Text>
                  </View>
                  <View style={styles.priceAvailabilityRow}>
                    <View style={styles.priceContainer}>
                      <MaterialCommunityIcons name="currency-usd" size={16} color={Colors.textSecondary} />
                      <Text style={styles.price}>{location.price}</Text>
                    </View>
                    <View style={[styles.availabilityBadge, { backgroundColor: getAvailabilityColor(location.available, location.total) }]}>
                      <Text style={styles.availabilityText}>{location.available}/{location.total} available</Text>
                    </View>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.directionsButton}>
                <Text style={styles.directionsButtonText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  logoButton: { width: 50, height: 50, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  headerIcons: { flexDirection: 'row', gap: Spacing.md },
  iconButton: { padding: Spacing.xs },
  content: { flex: 1 },
  titleSection: { padding: Spacing.lg, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Spacing.xs },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  filterContainer: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, backgroundColor: Colors.white },
  filterButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl, backgroundColor: Colors.backgroundGray, marginRight: Spacing.sm },
  filterButtonActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: Colors.white },
  locationsContainer: { padding: Spacing.lg },
  locationCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  locationHeader: { flexDirection: 'row', marginBottom: Spacing.md },
  parkingIcon: { width: 60, height: 60, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  locationInfo: { flex: 1 },
  locationTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  locationName: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  distance: { fontSize: 14, color: Colors.textSecondary },
  locationType: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xs },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  address: { fontSize: 14, color: Colors.textSecondary },
  priceAvailabilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  availabilityBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  availabilityText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  directionsButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  directionsButtonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});