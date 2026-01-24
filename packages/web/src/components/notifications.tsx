import { Notifications, notifications } from "@mantine/notifications";
import { FirebaseError } from "firebase/app";

type NotificationType = "info" | "success" | "error";

export interface NotificationPayload {
  title?: string;
  message: string;
  autoClose?: number | boolean;
  id?: string;
}

/**
 * Mount this once near the root (e.g., in `frontend.tsx`) to enable notifications.
 */
export const UnoNotificationsHost = () => (
  <Notifications position="top-right" limit={4} zIndex={2200} />
);

const typeDefaults: Record<NotificationType, { color: string; title: string }> =
  {
    info: { color: "unoBlue", title: "Notice" },
    success: { color: "unoGreen", title: "Success" },
    error: { color: "red", title: "Something went wrong" },
  };

/**
 * Show a typed, themed notification.
 */
const notify = (type: NotificationType, payload: NotificationPayload) => {
  const defaults = typeDefaults[type];
  notifications.show({
    color: defaults.color,
    title: payload.title ?? defaults.title,
    message: payload.message,
    autoClose: payload.autoClose ?? 4000,
    id: payload.id,
  });
};

export const notifyInfo = (payload: NotificationPayload) =>
  notify("info", payload);

export const notifySuccess = (payload: NotificationPayload) =>
  notify("success", payload);

export const notifyError = (err: unknown) => {
  console.error("Error encountered:", err);

  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/network-request-failed":
        notify("error", {
          message: "Network error. Please check your internet connection.",
        });
        return;
      case "auth/user-disabled":
        notify("error", {
          message: "Your account has been disabled. Please contact support.",
        });
        return;
      case "auth/wrong-password":
        notify("error", {
          message: "Incorrect password. Please try again.",
        });
        return;
      case "auth/user-not-found":
        notify("error", {
          message: "No account found with the provided credentials.",
        });
        return;
    }
  }

  notify("error", {
    message: "An unexpected error occurred. Please try again.",
  });
};
