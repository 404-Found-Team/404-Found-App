import React, { useState, useEffect } from 'react';
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
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import axios from 'axios';

export default function AlertsScreen() {
  const API_BASE_URL = 'http://localhost:8000/api/v1'; // Update with your actual backend URL
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch alerts from the backend
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/safety`);
        const alertData = response.data.lots.map((alert, index) => ({
          id: index.toString(), // Generate a unique ID for each alert
          type: alert.type,
          title: alert.type.charAt(0).toUpperCase() + alert.type.slice(1), // Capitalize the type for the title
          description: alert.description,
          location: alert.location,
          time: new Date(alert.timestamp).toLocaleString(), // Format timestamp
          upvotes: alert.upvotes,
          downvotes: alert.downvotes,
          backgroundColor: getAlertColor(alert.type),
          icon: getAlertIcon(alert.type),
          iconColor: getAlertIconColor(alert.type),
        }));

        // If no alerts are returned, add a hardcoded alert for testing
        // if (alertData.length === 0) {
        //   alertData.push({
        //     id: 'test-alert',
        //     type: 'Traffic',
        //     title: 'Test Alert',
        //     description: 'This is a hardcoded test alert.',
        //     location: 'Test Location',
        //     time: 'Just now',
        //     upvotes: 0,
        //     downvotes: 0,
        //     backgroundColor: Colors.alertYellow,
        //     icon: 'alert',
        //     iconColor: '#F5A623',
        //   });
        // }

        setAlerts(alertData);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const getAlertColor = (type) => {
    switch (type) {
      case 'Traffic':
        return Colors.alertYellow;
      case 'Construction':
        return Colors.alertOrange;
      case 'Accident':
        return Colors.alertRed;
      case 'Transit':
        return Colors.alertBlue;
      default:
        return Colors.alertGray;
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'Traffic':
        return 'alert';
      case 'Construction':
        return 'road-variant';
      case 'Accident':
        return 'alert-circle';
      case 'Transit':
        return 'train';
      default:
        return 'information';
    }
  };

  const getAlertIconColor = (type) => {
    switch (type) {
      case 'Traffic':
        return '#F5A623';
      case 'Construction':
        return '#E67E22';
      case 'Accident':
        return '#E74C3C';
      case 'Transit':
        return '#3498DB';
      default:
        return '#7F8C8D';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading alerts...</Text>
      </SafeAreaView>
    );
  }

  // const [alertPreferences, setAlertPreferences] = useState({
  //   trafficAlerts: true,
  //   constructionUpdates: true,
  //   transitDelays: true,
  //   weatherWarnings: false,
  // });

  // const alertSummary = [
  //   { type: 'Traffic Alerts', count: 1, color: Colors.alertYellow },
  //   { type: 'Construction', count: 1, color: Colors.alertOrange },
  // ];

  // alerts = [
  //   {
  //     id: '1',
  //     type: 'traffic',
  //     icon: 'alert',
  //     iconColor: '#F5A623',
  //     title: 'Heavy Traffic on I-75 North',
  //     description: 'Expect delays of up to 15 minutes due to high traffic volume.',
  //     location: 'I-75 North between Exit 12 and Exit 15',
  //     time: '5 min ago',
  //     upvotes: 5,
  //     downvotes: 1,
  //     backgroundColor: Colors.alertYellow,
  //   },
  //   {
  //     id: '2',
  //     type: 'construction',
  //     icon: 'road-variant',
  //     iconColor: '#E67E22',
  //     title: 'Road Construction',
  //     description: 'Left lane closed on Oak Avenue. Use alternate route.',
  //     location: 'Oak Avenue near Main Street',
  //     time: '1 hour ago',
  //     upvotes: 5,
  //     downvotes: 1,
  //     backgroundColor: Colors.alertOrange,
  //   },
  //   {
  //     id: '3',
  //     type: 'accident',
  //     icon: 'alert-circle',
  //     iconColor: '#E74C3C',
  //     title: 'Accident Reported',
  //     description: 'Minor accident blocking right lane. Emergency services on scene.',
  //     location: 'I-675 South near Exit 8',
  //     time: '2 hours ago',
  //     upvotes: 5,
  //     downvotes: 1,
  //     backgroundColor: Colors.alertRed,
  //   },
  //   {
  //     id: '4',
  //     type: 'transit',
  //     icon: 'information',
  //     iconColor: '#3498DB',
  //     title: 'Red Line Delay',
  //     description: 'Train delays of 5-10 minutes due to signal maintenance.',
  //     location: 'Red Line - All Stations',
  //     time: '3 hours ago',
  //     upvotes: 5,
  //     downvotes: 1,
  //     backgroundColor: Colors.alertBlue,
  //   },
  // ];

  // const togglePreference = (key) => {
  //   setAlertPreferences(prev => ({
  //     ...prev,
  //     [key]: !prev[key],
  //   }));
  // };

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
            onPress={() => router.push('../screens/SettingsScreen')}
          >
            <Icon name="cog" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('../screens/MyAccountScreen')}
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

        {/* Alert Summary
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
        </View> */}

        {/* Active Alerts */}
        <View style={styles.alertsContainer}>
          {alerts.length > 0 ? (
            alerts.map(alert => (
            <View 
              key={alert.id} 
              style={[styles.alertCard, { backgroundColor: alert.backgroundColor }]}
            >
              <View style={styles.alertHeader}>
                <Icon name={alert.icon} size={24} color={alert.iconColor} />
                <Text style={styles.alertTitle}>{alert.title}</Text>
                {/* <TouchableOpacity style={styles.closeButton}>
                  <Icon name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity> */}
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
          )) 
        ) : (
          <View style={styles.noAlertsContainer}>
            <Icon name="alert-circle-outline" size={64} color={Colors.textLight} />
            <Text style={styles.noAlertsText}>No alerts available at the moment.</Text>
          </View>
        )}
        </View>

        {/* Alert Preferences */}
        {/* <View style={styles.preferencesSection}>
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
        </View> */}
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
    paddingTop: Spacing.sm,
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
  noAlertsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  noAlertsText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});