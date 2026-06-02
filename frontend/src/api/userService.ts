import { apiClient } from "./authService";

export interface UserProfile {
  username: string;
  email: string;
  pronouns: string;
  address: string;
  birthday: string; // "yyyy-MM-dd" or ""
  bio: string;
  avatar: string;  // base64 data URL or ""
}

export interface UserSettings {
  notificationsEnabled: boolean;
  locationSharingEnabled: boolean;
}

export const getUserProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get("/api/User/profile");
  return response.data;
};

export const updateUserProfile = async (profile: UserProfile): Promise<void> => {
  await apiClient.put("/api/User/profile", profile);
};

export const getUserKarma = async (): Promise<number> => {
  const response = await apiClient.get("/api/User/karma");
  return response.data.karma;
};

export const getKarmaByName = async (name: string): Promise<number> => {
  const response = await apiClient.get("/api/User/karma-by-name", {
    params: { name },
  });
  return response.data.karma;
};

export const getUserSettings = async (): Promise<UserSettings> => {
  const response = await apiClient.get("/api/User/settings");
  return response.data;
};

export const updateUserSettings = async (settings: UserSettings): Promise<void> => {
  await apiClient.put("/api/User/settings", settings);
};
