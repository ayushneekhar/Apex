import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { ActiveRestTimer } from '@/types/workout';

const REST_TIMER_CHANNEL_ID = 'rest-timer';

let notificationHandlerConfigured = false;
let restChannelConfigured = false;

export function createRestNotificationId(setId: string, endsAt: number): string {
  return `rest-timer:${setId}:${endsAt}`;
}

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

async function hasNotificationPermission(requestIfNeeded: boolean): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();

  if (current.granted || isIosStatusGranted(current)) {
    return true;
  }

  if (!requestIfNeeded || !current.canAskAgain) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || isIosStatusGranted(requested);
}

export async function configureRestNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  configureNotificationHandler();
  await ensureRestNotificationChannel();
}

export async function requestRestNotificationPermission(): Promise<boolean> {
  await configureRestNotifications();
  return hasNotificationPermission(true);
}

export async function isRestNotificationScheduled(notificationId: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const requests = await Notifications.getAllScheduledNotificationsAsync();
  return requests.some((request) => request.identifier === notificationId);
}

export async function scheduleRestCompleteNotification(
  restTimer: ActiveRestTimer,
  requestPermission = true
): Promise<string | null> {
  await configureRestNotifications();

  const hasPermission = await hasNotificationPermission(requestPermission);

  if (!hasPermission || restTimer.endsAt <= Date.now()) {
    return null;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    identifier: restTimer.notificationId,
    content: {
      title: 'Rest complete',
      body: `${restTimer.exerciseName}: You can start your next set now.`,
      sound: 'default',
      data: {
        type: 'rest-complete',
        setId: restTimer.setId,
        endsAt: restTimer.endsAt,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(restTimer.endsAt),
      ...(Platform.OS === 'android' ? { channelId: REST_TIMER_CHANNEL_ID } : {}),
    },
  });

  return notificationId;
}

export async function syncRestCompleteNotification(
  restTimer: ActiveRestTimer | null
): Promise<string | null> {
  if (!restTimer || restTimer.endsAt <= Date.now()) {
    return null;
  }

  await configureRestNotifications();

  if (!(await hasNotificationPermission(false))) {
    return null;
  }

  if (await isRestNotificationScheduled(restTimer.notificationId)) {
    return restTimer.notificationId;
  }

  return scheduleRestCompleteNotification(restTimer, false);
}

export async function cancelScheduledNotification(notificationId: string | null) {
  if (!notificationId || Platform.OS === 'web') {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
