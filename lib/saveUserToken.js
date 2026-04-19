import { registerFcmTokenForUser } from "./fcmClient";

/** Persists the device FCM token on `users/{uid}.fcmToken` for Cloud Messaging. */
export async function saveUserToken(uid) {
  return registerFcmTokenForUser(uid);
}
