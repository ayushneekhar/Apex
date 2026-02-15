import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REST_TIMER_CHANNEL_ID = 'rest-timer';

let notificationHandlerConfigured = false;
let restChannelConfigured = false;

function configureNotificationHandler() {
  if (notificationHandlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  notificationHandlerConfigured = true;
}

function isIosStatusGranted(status: Notifications.NotificationPermissionsStatus): boolean {
  const iosStatus = status.ios?.status;

  return (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

async function ensureRestNotificationChannel() {
  if (Platform.OS !== 'android' || restChannelConfigured) {
    return;
  }

  await Notifications.setNotificationChannelAsync(REST_TIMER_CHANNEL_ID, {
    name: 'Rest Timer',
    description: 'Alerts you when your rest timer is complete.',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });

  restChannelConfigured = true;
}

async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();

  if (current.granted || isIosStatusGranted(current)) {
    return true;
  }

  if (!current.canAskAgain) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || isIosStatusGranted(requested);
}

export async function scheduleRestCompleteNotification(
  seconds: number,
  exerciseName: string
): Promise<string | null> {
  configureNotificationHandler();

  const hasPermission = await hasNotificationPermission();

  if (!hasPermission) {
    return null;
  }

  await ensureRestNotificationChannel();

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rest complete',
      body: `${exerciseName}: You can start your next set now.`,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(seconds)),
      repeats: false,
      ...(Platform.OS === 'android' ? { channelId: REST_TIMER_CHANNEL_ID } : {}),
    },
  });

  return notificationId;
}

export async function cancelScheduledNotification(notificationId: string | null) {
  if (!notificationId || Platform.OS === 'web') {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
