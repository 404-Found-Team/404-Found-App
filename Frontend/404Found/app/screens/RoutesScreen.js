import { StatusBar } from 'expo-status-bar';  //
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // NO import Icon
import { Colors, Spacing, BorderRadius } from '../constants/theme';

const RoutesScreen = ({ navigation }) => {
  const [origin, setOrigin] = useState('Current Location');
  const [destination, setDestination] = useState('Langdale Hall');
  const [arriveBy, setArriveBy] = useState('9:00 AM');

  const routes = [
    {
      id: '1',
      type: 'Drive',
      icon: 'car',
      duration: '22 Min',
      tag: 'Recommended',
      tagColor: Colors.primary,
      description: 'Drive 16 min I-75 North → Park at G-Deck → Walk 3 mins',
      departTime: '8:35 AM',
      cost: '$2.50',
      fastest: true,
    },
    {
      id: '2',
      type: 'Transit',
      icon: 'train',
      duration: '35 Min',
      tag: 'Eco-Friendly',
      tagColor: Colors.success,
      description: 'Walk 5 min → Blue Line to Central Station → Walk 8 mins',
      departTime: '8:20 AM',
      cost: '$2.75',
      fastest: false,
    },
    {
      id: '3',
      type: 'Walk',
      icon: 'walk',
      duration: '52 Min',
      tag: 'Scenic',
      tagColor: Colors.info,
      description: 'Walk via Main Street path',
      departTime: '8:08 AM',
      cost: 'Free',
      fastest: false,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />    /* This isn't here in the old version */
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoButton}>
    /* Replace Icon with MaterialCommunityIcons */      <MaterialCommunityIcons name="map-marker" size={28} color={Colors.primaryDark} />
        </View>
        
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialCommunityIcons name="menu" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <MaterialCommunityIcons name="cog" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('MyAccount')}
          >
            <MaterialCommunityIcons name="account" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Route Planning Section */}
        <View style={styles.planningSection}>
          <Text style={styles.title}>Plan Your Route</Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={origin}
              onChangeText={setOrigin}
              placeholder="Current Location"
              placeholderTextColor={Colors.textLight}
            />
            
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="Destination"
              placeholderTextColor={Colors.textLight}
            />
            
            <View style={styles.timeInput}>
              <Text style={styles.timeLabel}>Arrive By</Text>
              <Text style={styles.timeValue}>{arriveBy}</Text>
            </View>
          </View>
        </View>

        {/* Routes */}
        <View style={styles.routesContainer}>
          {routes.map((route, index) => (
            <TouchableOpacity key={route.id} style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <View style={styles.routeIconContainer}>
                  <MaterialCommunityIcons name={route.icon} size={28} color={Colors.white} />
                </View>
                
                <View style={styles.routeMainInfo}>
                  <Text style={styles.routeType}>{route.type}</Text>
                  <Text style={styles.routeDuration}>{route.duration}</Text>
                </View>
                
                {route.tag && (
                  <View style={[styles.routeTag, { backgroundColor: route.tagColor }]}>
                    <Text style={styles.routeTagText}>{route.tag}</Text>
                  </View>
                )}
              </View>

              {route.fastest && (
                <Text style={styles.fastestRoute}>Fastest Route</Text>
              )}

              <Text style={styles.routeDescription}>{route.description}</Text>

              <View style={styles.routeFooter}>
                <View style={styles.routeDetail}>
                  <Text style={styles.detailLabel}>Depart</Text>
                  <Text style={styles.detailValue}>{route.departTime}</Text>
                </View>
                
                <View style={styles.routeDetail}>
                  <Text style={styles.detailLabel}>Cost</Text>
                  <Text style={styles.detailValue}>{route.cost}</Text>
                </View>
              </View>
            </TouchableOpacity>
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
  planningSection: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  timeInput: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 16,
    color: Colors.white,
  },
  timeValue: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
  routesContainer: {
    padding: Spacing.lg,
  },
  routeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  routeIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  routeMainInfo: {
    flex: 1,
  },
  routeType: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  routeDuration: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  routeTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  routeTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  fastestRoute: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  routeDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  routeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  routeDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});

export default RoutesScreen;