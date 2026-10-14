import Constants from "expo-constants";
import { apiBase } from "../../../packages/core/src/api-config";
export const API_BASE = apiBase(process.env.EXPO_PUBLIC_API_BASE_URL, __DEV__ || Constants.expoConfig?.extra?.localBuild === true);
