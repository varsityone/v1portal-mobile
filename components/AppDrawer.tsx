import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useAuth } from '../hooks/useAuth';
import { useAthleteData } from '../hooks/useAthleteData';
import { useTheme } from '../context/ThemeContext';

// ─── Nav structure ────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Dashboard',         href: '/(tabs)',              icon: 'grid'         as const, iconOff: 'grid-outline'          as const },
  { label: 'My V1 Score',       href: '/(tabs)/gameplan/1',  icon: 'analytics'    as const, iconOff: 'analytics-outline'     as const },
  { label: 'Build Profile',     href: '/(tabs)/profile',     icon: 'person'       as const, iconOff: 'person-outline'        as const },
  { label: 'Program Targeting', href: '/(tabs)/programs',    icon: 'school'       as const, iconOff: 'school-outline'        as const },
  { label: 'Outreach',          href: '/(tabs)/outreach',    icon: 'mail'         as const, iconOff: 'mail-outline'          as const },
  { label: 'Coach Tracker',     href: '/(tabs)/coaches',     icon: 'people'       as const, iconOff: 'people-outline'        as const },
  { label: 'Calendar',          href: '/(tabs)/calendar',    icon: 'calendar'     as const, iconOff: 'calendar-outline'      as const },
  { label: 'Analytics',         href: '/(tabs)/analytics',   icon: 'bar-chart'    as const, iconOff: 'bar-chart-outline'     as const },
];

// Profile Settings sub-items — matches web DashboardShell exactly
const PROFILE_SUB_ITEMS = [
  { label: 'Edit Profile',    href: '/(tabs)/edit-profile' },
  { label: 'Athlete Profile', href: '/(tabs)/profile'      },
  { label: 'Settings',        href: '/(tabs)/settings'     },
];

// ─── Social icons — exact SVG paths from web DashboardShell ──────────────────

function IconX({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={color}>
      <Path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </Svg>
  );
}

function IconLinkedIn({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={color}>
      <Path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
      <Circle cx={4} cy={4} r={2} />
    </Svg>
  );
}

function IconFacebook({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={color}>
      <Path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </Svg>
  );
}

function IconInstagram({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={2} width={20} height={20} rx={5} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={2} />
      <Circle cx={17.5} cy={6.5} r={1} fill={color} />
    </Svg>
  );
}

function IconMoon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  );
}

function IconSun({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </Svg>
  );
}

const SOCIAL = [
  { label: 'X',         url: 'https://x.com/thev1portal',               Icon: IconX         },
  { label: 'LinkedIn',  url: 'https://linkedin.com/company/v1portal',    Icon: IconLinkedIn  },
  { label: 'Facebook',  url: 'https://facebook.com/v1portal',            Icon: IconFacebook  },
  { label: 'Instagram', url: 'https://instagram.com/v1.portal',          Icon: IconInstagram },
];

// ─── Theme ────────────────────────────────────────────────────────────────────

const DARK = {
  bg:        '#18191d',
  surface:   '#28292e',
  border:    'rgba(255,255,255,0.09)',
  text:      '#e8e9ea',
  textMuted: '#9a9da2',
  textDim:   '#5a5d63',
  primary:   '#833AB4',
  activeBg:  'rgba(131,58,180,0.12)',
};

const LIGHT = {
  bg:        '#f0f0f0',
  surface:   '#ffffff',
  border:    'rgba(0,0,0,0.08)',
  text:      '#1a1b1d',
  textMuted: '#5a5d63',
  textDim:   '#9a9da2',
  primary:   '#833AB4',
  activeBg:  'rgba(131,58,180,0.10)',
};

// ─── Drawer content ───────────────────────────────────────────────────────────

export default function AppDrawer(props: DrawerContentComponentProps) {
  const { theme, setTheme } = useTheme();
  const scheme = theme;
  const C = scheme === 'light' ? LIGHT : DARK;
  const router = useRouter();
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const { athlete } = useAthleteData();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const isElite =
    athlete?.subscription_status === 'active' &&
    athlete?.subscription_tier === 'elite';

  const isActive = (href: string) => {
    if (href === '/(tabs)') return pathname === '/' || pathname === '/(tabs)';
    const clean = href.replace('/(tabs)', '');
    return pathname.startsWith(clean) && clean !== '';
  };

  const navigate = (href: string) => {
    props.navigation.closeDrawer();
    router.push(href as any);
  };

  const profileSettingsActive = isActive('/(tabs)/profile') || isActive('/(tabs)/settings');

  const email = session?.user?.email ?? '';
  const fullName = athlete?.full_name || '';
  const displayName = fullName || email;
  const initials = fullName
    ? fullName.trim().split(' ').filter(Boolean).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()
    : email.slice(0, 2).toUpperCase();

  return (
    <View style={[d.root, { backgroundColor: C.bg }]}>

      {/* Logo */}
      <View style={d.logoBox}>
        <Image
          source={
            scheme === 'light'
              ? require('../assets/logo-light.png')
              : require('../assets/logo-dark.png')
          }
          style={d.logo}
          resizeMode="contain"
        />
        <Pressable onPress={() => props.navigation.closeDrawer()} style={d.closeBtn} hitSlop={8}>
          <Ionicons name="close" size={20} color={C.textMuted} />
        </Pressable>
      </View>

      {/* User profile header */}
      <View style={[d.profileHeader, { borderBottomColor: C.border }]}>
        {athlete?.profile_photo_url ? (
          <Image source={{ uri: athlete.profile_photo_url }} style={d.profilePhoto} />
        ) : (
          <View style={[d.profilePhoto, d.profilePhotoFallback, { backgroundColor: scheme === 'dark' ? '#ffffff' : '#000000' }]}>
            <Text style={[d.profilePhotoInitials, { color: scheme === 'dark' ? '#000000' : '#ffffff' }]}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[d.profileName, { color: C.text }]} numberOfLines={1}>{displayName}</Text>
          {fullName ? <Text style={[d.profileEmail, { color: C.textMuted }]} numberOfLines={1}>{email}</Text> : null}
        </View>
      </View>

      {/* Scrollable nav */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* Nav items */}
        <Text style={[d.groupLabel, { color: C.textDim }]}>NAVIGATION</Text>
        <View style={d.navList}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href);
            return (
              <Pressable
                key={item.href}
                style={({ pressed }) => [
                  d.navItem,
                  pressed && { backgroundColor: 'rgba(255,255,255,0.05)' },
                ]}
                onPress={() => navigate(item.href)}
              >
                <Ionicons
                  name={active ? item.icon : item.iconOff}
                  size={17}
                  color={scheme === 'dark' ? '#ffffff' : '#252525'}
                />
                <Text style={[d.navLabel, { color: scheme === 'dark' ? '#ffffff' : '#252525', fontWeight: active ? '700' : '400' }]}>
                  {item.label}
                </Text>
                {active && <View style={[d.activeBar, { backgroundColor: C.textMuted }]} />}
              </Pressable>
            );
          })}

          {/* Profile Settings — collapsible submenu, matches web exactly */}
          <View>
            <Pressable
              style={({ pressed }) => [
                d.navItem,
                pressed && { backgroundColor: 'rgba(255,255,255,0.05)' },
              ]}
              onPress={() => setProfileMenuOpen(v => !v)}
            >
              <Ionicons
                name={profileSettingsActive ? 'settings' : 'settings-outline'}
                size={17}
                color={scheme === 'dark' ? '#ffffff' : '#252525'}
              />
              <Text style={[d.navLabel, { color: scheme === 'dark' ? '#ffffff' : '#252525', fontWeight: profileSettingsActive ? '700' : '400', flex: 1 }]}>
                Profile Settings
              </Text>
              <Ionicons
                name={profileMenuOpen ? 'chevron-down' : 'chevron-forward'}
                size={13}
                color={scheme === 'dark' ? '#ffffff' : '#252525'}
              />
            </Pressable>

            {/* Sub-items */}
            {profileMenuOpen && (
              <View style={d.subMenu}>
                {PROFILE_SUB_ITEMS.map(sub => {
                  return (
                    <Pressable
                      key={sub.label}
                      style={({ pressed }) => [
                        d.subItem,
                        pressed && { backgroundColor: `${C.primary}06` },
                      ]}
                      onPress={() => navigate(sub.href)}
                    >
                      <Text style={[d.subItemText, { color: C.textMuted }]}>
                        {sub.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Coach+ section — only for elite subscribers */}
        {isElite && (
          <View>
            <Text style={[d.groupLabel, { color: 'rgba(199,0,156,0.7)', marginTop: 10 }]}>COACH+</Text>
            <View style={d.navList}>
              {[
                { label: 'Advisor Hub',   href: '/(tabs)/coach-plus', icon: 'person' as const,    iconOff: 'person-outline' as const },
                { label: 'Schedule Call', href: '__schedule_call__',  icon: 'calendar' as const,  iconOff: 'calendar-outline' as const },
              ].map(item => {
                const active = isActive(item.href);
                return (
                  <Pressable
                    key={item.href}
                    style={({ pressed }) => [
                      d.navItem,
                      pressed && { backgroundColor: 'rgba(199,0,156,0.06)' },
                    ]}
                    onPress={() => {
                      if (item.href === '__schedule_call__') {
                        props.navigation.closeDrawer();
                        Linking.openURL('https://v1portal.com/dashboard/schedule-call');
                      } else {
                        navigate(item.href);
                      }
                    }}
                  >
                    <Ionicons
                      name={active ? item.icon : item.iconOff}
                      size={17}
                      color={scheme === 'dark' ? '#ffffff' : '#252525'}
                    />
                    <Text style={[d.navLabel, { color: scheme === 'dark' ? '#ffffff' : '#252525', fontWeight: active ? '700' : '400' }]}>
                      {item.label}
                    </Text>
                    {active && <View style={[d.activeBar, { backgroundColor: C.textMuted }]} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Dashboard Tour */}
        <Pressable
          style={[d.tourBtn]}
          onPress={() => {
            props.navigation.closeDrawer();
            router.push('/(tabs)' as any);
          }}
        >
          <Ionicons name="play-circle" size={15} color="rgb(200, 0, 167)" />
          <Text style={[d.tourText, { color: 'rgb(200, 0, 167)' }]}>Dashboard Tour</Text>
        </Pressable>

        {/* Divider */}
        <View style={[d.divider, { backgroundColor: C.border }]} />

        {/* Social links + theme toggle row */}
        <View style={d.socialSection}>
          <Text style={[d.groupLabel, { color: C.textDim }]}>GET IN TOUCH</Text>
          <View style={d.socialRow}>
            {SOCIAL.map(s => (
              <Pressable
                key={s.label}
                style={d.socialIcon}
                onPress={() => Linking.openURL(s.url)}
                hitSlop={10}
              >
                <s.Icon color={C.textMuted} />
              </Pressable>
            ))}

            {/* Theme toggle — matches web: moon/sun, gradient active state */}
            <View style={[d.themeToggle, { backgroundColor: C.surface }]}>
              <Pressable onPress={() => setTheme('dark')}>
                {scheme === 'dark' ? (
                  <LinearGradient
                    colors={['#ff0000', '#aa00ff']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={d.themeBtn}
                  >
                    <IconMoon color="#fff" />
                  </LinearGradient>
                ) : (
                  <View style={d.themeBtn}>
                    <IconMoon color={C.textMuted} />
                  </View>
                )}
              </Pressable>
              <Pressable onPress={() => setTheme('light')}>
                {scheme === 'light' ? (
                  <LinearGradient
                    colors={['#ff0000', '#aa00ff']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={d.themeBtn}
                  >
                    <IconSun color="#fff" />
                  </LinearGradient>
                ) : (
                  <View style={d.themeBtn}>
                    <IconSun color={C.textMuted} />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* Visit VarsityOne */}
        <Pressable
          style={[d.voLink, { borderColor: C.border }]}
          onPress={() => Linking.openURL('https://varsityone.com')}
        >
          <Ionicons name="globe-outline" size={14} color={C.textMuted} />
          <Text style={[d.voText, { color: C.textMuted }]}>Visit VarsityOne →</Text>
        </Pressable>

      </ScrollView>

      {/* Footer */}
      <View style={[d.footer, { borderTopColor: C.border }]}>
        <View style={d.userRow}>
          {athlete?.profile_photo_url ? (
            <Image source={{ uri: athlete.profile_photo_url }} style={d.avatar} />
          ) : (
            <View style={[d.avatar, { backgroundColor: scheme === 'dark' ? '#ffffff' : '#000000' }]}>
              <Text style={[d.avatarText, { color: scheme === 'dark' ? '#000000' : '#ffffff' }]}>{initials}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[d.userName, { color: C.text }]} numberOfLines={1}>{displayName}</Text>
            {fullName ? (
              <Text style={[d.userEmail, { color: C.textMuted }]} numberOfLines={1}>{email}</Text>
            ) : null}
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [d.signOut, pressed && { opacity: 0.6 }]}
          onPress={signOut}
        >
          <Ionicons name="log-out-outline" size={15} color={C.textDim} />
          <Text style={[d.signOutText, { color: C.textDim }]}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const d = StyleSheet.create({
  root: { flex: 1 },

  logoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  logo: { height: 28, width: 130 },
  closeBtn: { padding: 4 },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  profilePhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
  },
  profilePhotoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoInitials: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 1,
  },

  groupLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
  },
  navList: { gap: 1, paddingHorizontal: 10 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    position: 'relative',
  },
  navLabel: { fontSize: 14 },
  activeBar: { width: 3, height: 18, borderRadius: 2, position: 'absolute', right: 0 },

  // Profile Settings submenu
  subMenu: {
    marginLeft: 44,
    marginRight: 10,
    marginBottom: 2,
  },
  subItem: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  subItemText: {
    fontSize: 13,
    fontWeight: '500',
  },

  tourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 22,
    marginTop: 10,
    marginBottom: 6,
    paddingVertical: 6,
  },
  tourText: { fontSize: 14, fontWeight: '600' },

  divider: { height: 1, marginHorizontal: 16, marginVertical: 12 },

  socialSection: { marginBottom: 20 },
  socialRow: { flexDirection: 'row', gap: 0, paddingHorizontal: 20, alignItems: 'center' },
  socialIcon: { padding: 4 },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    gap: 2,
    marginLeft: 'auto',
  },
  themeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  voLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  voText: { fontSize: 13, fontWeight: '500' },


  footer: { borderTopWidth: 1, padding: 16, gap: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700' },
  userName: { fontSize: 13, fontWeight: '600' },
  userEmail: { fontSize: 11 },
  signOut: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  signOutText: { fontSize: 14 },
});
