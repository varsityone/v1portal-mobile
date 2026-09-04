import { Platform } from 'react-native';
import Purchases, { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

let configured = false;

// RevenueCat's appUserID is set to the Supabase auth user id so the
// RevenueCat webhook can map purchase events straight back to the
// matching `athletes` row (same join pattern the Stripe webhook uses).
export function configurePurchases(userId: string) {
  if (Platform.OS === 'web') return;
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) return;

  if (!configured) {
    Purchases.configure({ apiKey, appUserID: userId });
    configured = true;
  } else {
    Purchases.logIn(userId).catch(() => {});
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (Platform.OS === 'web') return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export function hasActiveEntitlement(info: CustomerInfo): boolean {
  return Object.keys(info.entitlements.active).length > 0;
}
