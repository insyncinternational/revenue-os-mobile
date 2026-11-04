import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/api/notifications";
import { go, openApproval, openContact, openConversation, openDeal, openMeeting, openTaskForm } from "@/lib/navigate";
import { keys } from "@/query/keys";
import { openAgencyAlert } from "@/features/agency/openAlert";
import { agencyIdInLink } from "@/features/agency/agency";
import { useAppMode } from "@/session/mode";
import { useSession } from "@/session/sessionStore";
import { registerForPush, setAppBadge } from "./push";
import { routeForPush, type PushData } from "./routing";

/** Opens what a tapped notification is about — in the right workspace first. */
function openFromPush(response: Notifications.NotificationResponse | null | undefined) {
  if (!response) return;
  const data = response.notification.request.content.data as PushData;
  // An agency alert (new client, payment, credit pool): the agency area, on the screen it's about.
  if (agencyIdInLink(data?.action_url)) return openAgencyAlert(data);
  const { baseId, conversation, meeting, approval, deal, task, contact, link } = routeForPush(data);
  if (baseId) useSession.getState().setActiveBase(baseId);
  // About a workspace while in the agency area: open it in the workspace tabs.
  if (baseId && useAppMode.getState().mode === "agency") useAppMode.getState().enterWorkspace();
  if (conversation) openConversation(conversation);
  else if (meeting) openMeeting(meeting);
  else if (approval) openApproval(approval);
  else if (deal) openDeal(deal);
  else if (task) openTaskForm({ id: task });
  else if (contact) openContact(contact);
  else go(link);
}

/**
 * Signed-in side of push: re-registers this phone on every launch (silent when not allowed yet), opens
 * tapped notifications (also when the tap launched the app), and keeps the app-icon badge on the unread count.
 */
export function usePushSetup() {
  const unread = useQuery({
    // The app-icon badge counts every workspace (something new in another one should still show).
    queryKey: keys.notifications.unreadCount(null),
    queryFn: ({ signal }) => notificationsApi.unreadCount(null, signal),
    staleTime: 30_000,
  }).data?.unread_count;

  useEffect(() => {
    void registerForPush();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    // The tap that launched the app from closed.
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) {
        openFromPush(r);
        void Notifications.clearLastNotificationResponseAsync();
      }
    });
    const sub = Notifications.addNotificationResponseReceivedListener(openFromPush);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (unread != null) setAppBadge(unread);
  }, [unread]);
}
