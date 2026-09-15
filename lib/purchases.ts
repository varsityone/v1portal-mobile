import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import Purchases, { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

export const MATCH_PRODUCT_ID = 'com.varsityone.v1portal.matchplus.monthly';
export const MATCH_ENTITLEMENT_ID = 'match';
let configured = false;
let identityReady: Promise<unknown> = Promise.resolve();
const nativePurchasesAvailable = Platform.OS !== 'web'
  && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

// RevenueCat's appUserID is set to the Supabase auth user id so the
// RevenueCat webhook can map purchase events straight back to the
// matching `athletes` row (same join pattern the Stripe webhook uses).
export function configurePurchases(userId: string) {
  if (!nativePurchasesAvailable) return;
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) return;

  if (!configured) {
    try {
      Purchases.configure({ apiKey, appUserID: userId });
      configured = true;
    } catch (error) {
      console.warn('Unable to configure purchases:', error);
    }
  } else {
    identityReady = Purchases.logIn(userId);
    void identityReady.catch(error => console.warn('Unable to identify purchases:', error));
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!nativePurchasesAvailable || !configured) return null;
  await identityReady;
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  if (!nativePurchasesAvailable || !configured) throw new Error('Purchases require a configured native app build.');
  await identityReady;
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  if (!nativePurchasesAvailable || !configured) throw new Error('Restoring purchases requires a configured native app build.');
  await identityReady;
  return Purchases.restorePurchases();
}

export function hasActiveEntitlement(info: CustomerInfo): boolean {
  return !!info.entitlements.active[MATCH_ENTITLEMENT_ID];
}

// The server resolves the account from the session and verifies RevenueCat.
// Client-side entitlement data is never used to authorize a database write.
export async function syncSubscriptionAccess(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in again.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('https://v1portal.com/api/subscriptions/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error('Unable to verify your subscription.');
    return result.status === 'active';
  } finally {
    clearTimeout(timeout);
  }
}
