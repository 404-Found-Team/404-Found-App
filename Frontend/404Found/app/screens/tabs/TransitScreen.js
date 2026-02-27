import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

export default function TransitScreen() {
  const router = useRouter();
  const nearbyStops = [
    {
      id: '1',
      name: 'Central Station',
      distance: '0.2 mi',
      lines: ['Red Line', 'Blue Line', 'Green Line'],
    },
    {
      id: '2',
      name: 'Main Street Stop',
      distance: '0.4 mi',
      lines: ['Route 42', 'Route 15'],
    },
  ];

  const allLines = [
    {
      id: '1',
      name: 'Red Line',
      stops: '12 stops',
      status: 'On Time',
      nextArrival: '3 min',
    },
    {
      id: '2',
      name: 'Blue Line',
      stops: '15 stops',
      status: 'Delayed',
      nextArrival: '8 min',
    },
  ];

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
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('../screens/SettingsScreen')}
          >
            <MaterialCommunityIcons name="cog" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('../screens/MyAccountScreen')}
          >
            <MaterialCommunityIcons name="account" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Public Transit</Text>
          <Text style={styles.subtitle}>Real-time transit information</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Stops</Text>
          
          {nearbyStops.map(stop => (
            <View key={stop.id} style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <View style={styles.stopInfo}>
                  <MaterialCommunityIcons name="map-marker" size={20} color={Colors.primaryDark} />
                  <Text style={styles.stopName}>{stop.name}</Text>
                </View>
                <Text style={styles.distance}>{stop.distance}</Text>
              </View>
              <Text style={styles.lines}>{stop.lines.join(', ')}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Lines</Text>
          
          {allLines.map(line => (
            <View key={line.id} style={styles.lineCard}>
              <View style={styles.lineHeader}>
                <View style={styles.lineIcon}>
                  <MaterialCommunityIcons name="train" size={24} color={Colors.white} />
                </View>
                <View style={styles.lineInfo}>
                  <Text style={styles.lineName}>{line.name}</Text>
                  <Text style={styles.lineStops}>{line.stops}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: line.status === 'On Time' ? Colors.success : Colors.warning }
                ]}>
                  <Text style={styles.statusText}>{line.status}</Text>
                </View>
              </View>
              
              <View style={styles.arrivalInfo}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.arrivalText}>Next arrival: {line.nextArrival}</Text>
              </View>
            </View>
          ))}
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
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  stopCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  stopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  distance: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  lines: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  lineCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  lineIcon: {
    width: 48,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  lineInfo: {
    flex: 1,
  },
  lineName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  lineStops: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  arrivalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  arrivalText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
});