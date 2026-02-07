import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';

const AlertsScreen = ({ navigation }) => {
  const [alertPreferences, setAlertPreferences] = useState({
    trafficAlerts: true,
    constructionUpdates: true,
    transitDelays: true,
    weatherWarnings: false,
  });

  const alertSummary = [
    { type: 'Traffic Alerts', count: 1, color: Colors.alertYellow },
    { type: 'Construction', count: 1, color: Colors.alertOrange },
  ];

  const alerts = [
    {
      id: '1',
      type: 'traffic',
      icon: 'alert',
      iconColor: '#F5A623',
      title: 'Heavy Traffic on I-75 North',
      description: 'Expect delays of up to 15 minutes due to high traffic volume.',
      location: 'I-75 North between Exit 12 and Exit 15',
      time: '5 min ago',
      backgroundColor: Colors.alertYellow,
    },
    {
      id: '2',
      type: 'construction',
      icon: 'road-variant',
      iconColor: '#E67E22',
      title: 'Road Construction',
      description: 'Left lane closed on Oak Avenue. Use alternate route.',
      location: 'Oak Avenue near Main Street',
      time: '1 hour ago',
      backgroundColor: Colors.alertOrange,
    },
    {
      id: '3',
      type: 'accident',
      icon: 'alert-circle',
      iconColor: '#E74C3C',
      title: 'Accident Reported',
      description: 'Minor accident blocking right lane. Emergency services on scene.',
      location: 'I-675 South near Exit 8',
      time: '2 hours ago',
      backgroundColor: Colors.alertRed,
    },
    {
      id: '4',
      type: 'transit',
      icon: 'information',
      iconColor: '#3498DB',
      title: 'Red Line Delay',
      description: 'Train delays of 5-10 minutes due to signal maintenance.',
      location: 'Red Line - All Stations',
      time: '3 hours ago',
      backgroundColor: Colors.alertBlue,
    },
  ];

  const togglePreference = (key) => {
    setAlertPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="cog" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('MyAccount')}
          >
            <Icon name="account" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Alerts</Text>
          <Text style={styles.subtitle}>Traffic updates and notifications</Text>
        </View>

        {/* Alert Summary */}
        <View style={styles.summaryContainer}>
          {alertSummary.map((item, index) => (
            <View 
              key={index} 
              style={[styles.summaryCard, { backgroundColor: item.color }]}
            >
              <Text style={styles.summaryCount}>{item.count}</Text>
              <Text style={styles.summaryType}>{item.type}</Text>
            </View>
          ))}
        </View>

        {/* Active Alerts */}
        <View style={styles.alertsContainer}>
          {alerts.map(alert => (
            <View 
              key={alert.id} 
              style={[styles.alertCard, { backgroundColor: alert.backgroundColor }]}
            >
              <View style={styles.alertHeader}>
                <Icon name={alert.icon} size={24} color={alert.iconColor} />
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <TouchableOpacity style={styles.closeButton}>
                  <Icon name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.alertDescription}>{alert.description}</Text>
              
              <View style={styles.alertFooter}>
                <View style={styles.locationRow}>
                  <Icon name="map-marker" size={14} color={Colors.danger} />
                  <Text style={styles.locationText}>{alert.location}</Text>
                </View>
                <View style={styles.timeRow}>
                  <Icon name="clock-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.timeText}>{alert.time}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Alert Preferences */}
        <View style={styles.preferencesSection}>
          <Text style={styles.preferencesTitle}>Alert Preferences</Text>
          
          <View style={styles.preferencesList}>
            <TouchableOpacity 
              style={styles.preferenceItem}
              onPress={() => togglePreference('trafficAlerts')}
            >
              <Icon 
                name={alertPreferences.trafficAlerts ? "checkbox-marked" : "checkbox-blank-outline"} 
                size={24} 
                color={alertPreferences.trafficAlerts ? Colors.primary : Colors.textLight} 
              />
              <Text style={styles.preferenceText}>Traffic alerts</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.preferenceItem}
              onPress={() => togglePreference('constructionUpdates')}
            >
              <Icon 
                name={alertPreferences.constructionUpdates ? "checkbox-marked" : "checkbox-blank-outline"} 
                size={24} 
                color={alertPreferences.constructionUpdates ? Colors.primary : Colors.textLight} 
              />
              <Text style={styles.preferenceText}>Construction updates</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.preferenceItem}
              onPress={() => togglePreference('transitDelays')}
            >
              <Icon 
                name={alertPreferences.transitDelays ? "checkbox-marked" : "checkbox-blank-outline"} 
                size={24} 
                color={alertPreferences.transitDelays ? Colors.primary : Colors.textLight} 
              />
              <Text style={styles.preferenceText}>Transit delays</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.preferenceItem}
              onPress={() => togglePreference('weatherWarnings')}
            >
              <Icon 
                name={alertPreferences.weatherWarnings ? "checkbox-marked" : "checkbox-blank-outline"} 
                size={24} 
                color={alertPreferences.weatherWarnings ? Colors.primary : Colors.textLight} 
              />
              <Text style={styles.preferenceText}>Weather warnings</Text>
            </TouchableOpacity>
          </View>
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
  summaryContainer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  summaryType: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  alertsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  alertCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  alertTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  alertDescription: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  alertFooter: {
    gap: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  preferencesSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    marginTop: Spacing.md,
  },
  preferencesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  preferencesList: {
    gap: Spacing.md,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  preferenceText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
});

export default AlertsScreen;