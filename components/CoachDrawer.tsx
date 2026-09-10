import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useAuth } from '../hooks/useAuth';
import { useCoachData } from '../hooks/useCoachData';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { GRADIENT } from '../constants/Colors';
import { FontFamily } from '../constants/Fonts';

// ─── Nav structure — mirrors web's components/CoachShell.tsx NAV_GROUPS exactly ──

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconOff: React.ComponentProps<typeof Ionicons>['name'];
  badgeKey?: 'matches';
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/(coach)', icon: 'grid' as const, iconOff: 'grid-outline' as const },
    ],
  },
  {
    label: 'Find Talent',
    items: [
      { label: 'Discover', href: '/(coach)/match', icon: 'heart' as const, iconOff: 'heart-outline' as const },
      { label: 'Recruit Search', href: '/(coach)/search', icon: 'search' as const, iconOff: 'search-outline' as const },
      { label: 'Saved', href: '/(coach)/saved', icon: 'bookmark' as const, iconOff: 'bookmark-outline' as const },
      { label: 'My Matches', href: '/(coach)/matches', icon: 'people' as const, iconOff: 'people-outline' as const, badgeKey: 'matches' as const },
    ],
  },
  {
    label: 'Pipeline',
    items: [
      { label: 'Pipeline', href: '/(coach)/pipeline', icon: 'git-branch' as const, iconOff: 'git-branch-outline' as const },
      { label: 'Recruiting Board', href: '/(coach)/recruiting', icon: 'grid' as const, iconOff: 'grid-outline' as const },
    ],
  },
  {
    label: 'Outreach',
    items: [
      { label: 'Messages', href: '/(coach)/messages', icon: 'mail' as const, iconOff: 'mail-outline' as const },
      { label: 'Bulk Message', href: '/(coach)/bulk-message', icon: 'send' as const, iconOff: 'send-outline' as const },
      { label: 'Templates', href: '/(coach)/templates', icon: 'document' as const, iconOff: 'document-outline' as const },
      { label: 'Calendar', href: '/(coach)/calendar', icon: 'calendar' as const, iconOff: 'calendar-outline' as const },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Analytics', href: '/(coach)/analytics', icon: 'bar-chart' as const, iconOff: 'bar-chart-outline' as const },
      { label: 'Compliance', href: '/(coach)/compliance', icon: 'shield-checkmark' as const, iconOff: 'shield-checkmark-outline' as const },
    ],
  },
];

// Profile + Settings sub-items — matches web CoachShell exactly
const PROFILE_SUB_ITEMS = [
  { label: 'Edit Profile',      href: '/(coach)/profile/edit' },
  { label: 'Program Profile',   href: '/(coach)/profile'      },
  { label: 'Notifications',     href: '/(coach)/notifications-settings' },
  { label: 'Settings',          href: '/(coach)/settings'     },
];

// ─── Social icons — matches web CoachShell's set (X, LinkedIn, Instagram, YouTube) ──

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

function IconInstagram({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={2} width={20} height={20} rx={5} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={2} />
      <Circle cx={17.5} cy={6.5} r={1} fill={color} />
    </Svg>
  );
}

function IconYouTube({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={color}>
      <Path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </Svg>
  );
}

const SOCIAL = [
  { label: 'X',         url: 'https://x.com/v1portal',            Icon: IconX         },
  { label: 'LinkedIn',  url: 'https://www.linkedin.com/company/varsityone/', Icon: IconLinkedIn  },
  { label: 'Instagram', url: 'https://instagram.com/enterv1portal',       Icon: IconInstagram },
  { label: 'YouTube',   url: 'https://youtube.com/@v1portal',         Icon: IconYouTube   },
];

// ─── Theme ────────────────────────────────────────────────────────────────────

const DARK = {
  bg:        '#18191d',
  surfaceAlt: '#28292e',
  border:    'rgba(255,255,255,0.09)',
  text:      '#e8e9ea',
  textMuted: '#9a9da2',
  textDim:   '#5a5d63',
};

const LIGHT = {
  bg:        '#f0f0f0',
  surfaceAlt: '#e4e4e6',
  border:    'rgba(0,0,0,0.08)',
  text:      '#1a1b1d',
  textMuted: '#5a5d63',
  textDim:   '#9a9da2',
};

// ─── Drawer content ───────────────────────────────────────────────────────────

export default function CoachDrawer(props: DrawerContentComponentProps) {
  const { theme } = useTheme();
  const scheme = theme;
  const C = scheme === 'light' ? LIGHT : DARK;
  const router = useRouter();
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const { coach } = useCoachData();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [unreadMatches, setUnreadMatches] = useState(0);

  // Unread badge for "My Matches" — matches web's CoachShell poll exactly.
  useEffect(() => {
    const coachId = coach?.id;
    if (!coachId) return;
    let cancelled = false;

    const loadUnread = async () => {
      const { count } = await supabase
        .from('match_messages')
        .select('id, mutual_matches!inner(coach_id)', { count: 'exact', head: true })
        .eq('sender_type', 'athlete')
        .eq('read', false)
        .eq('mutual_matches.coach_id', coachId);
      if (!cancelled) setUnreadMatches(count ?? 0);
    };

    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [coach?.id]);

  const isActive = (href: string) => {
    if (href === '/(coach)') return pathname === '/' || pathname === '/(coach)';
    const clean = href.replace('/(coach)', '');
    return pathname.startsWith(clean) && clean !== '';
  };

  const navigate = (href: string) => {
    props.navigation.closeDrawer();
    router.push(href as any);
  };

  const profileSettingsActive = isActive('/(coach)/profile') || isActive('/(coach)/notifications-settings') || isActive('/(coach)/settings');

  const email = session?.user?.email ?? '';
  const fullName = coach?.full_name || '';
  const displayName = fullName || email || 'Coach';
  const initials = fullName
    ? fullName.trim().split(' ').filter(Boolean).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()
    : email.slice(0, 2).toUpperCase();

  return (
    <View style={[d.root, { backgroundColor: C.bg }]}>

      {/* Header: logo + close */}
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

      {/* Signal tag — matches web's shell-signal-tag (gradient dot + "COACH PORTAL"),
          rendered above the user row, matching web's shell-drawer-header order */}
      <View style={d.signalTag}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={d.signalDot} />
        <Text style={[d.signalText, { color: scheme === 'light' ? C.textMuted : '#ffffff' }]}>Coach Portal</Text>
      </View>

      {/* Coach avatar + name + tier badge — matches web's shell-drawer-header exactly */}
      <View style={d.profileHeader}>
        {coach?.profile_photo_url ? (
          <Image source={{ uri: coach.profile_photo_url }} style={d.avatar} />
        ) : (
          <View style={[d.avatar, { backgroundColor: scheme === 'dark' ? '#ffffff' : '#000000' }]}>
            <Text style={[d.avatarText, { color: scheme === 'dark' ? '#000000' : '#ffffff' }]}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[d.profileName, { color: C.text }]} numberOfLines={1}>{displayName}</Text>
          {coach?.verified ? (
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={d.tierBadge}>
              <Text style={d.tierBadgeText}>Verified Coach</Text>
            </LinearGradient>
          ) : (
            <View style={[d.tierBadge, { backgroundColor: C.surfaceAlt }]}>
              <Text style={[d.tierBadgeText, { color: C.textMuted }]}>Unverified</Text>
            </View>
          )}
        </View>
      </View>

      {/* School + division */}
      {(coach?.school_name || coach?.division) && (
        <View style={d.schoolBlock}>
          {coach?.school_name ? (
            <Text style={[d.schoolName, { color: C.textMuted }]} numberOfLines={1}>{coach.school_name}</Text>
          ) : null}
          {coach?.division ? (
            <Text style={[d.divisionText, { color: C.textDim }]}>{coach.division}</Text>
          ) : null}
        </View>
      )}

      {/* Scrollable nav */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={d.scrollContent} showsVerticalScrollIndicator={false}>

        {NAV_GROUPS.map(group => (
          <View key={group.label}>
            <Text style={[d.groupLabel, { color: C.textDim }]}>{group.label}</Text>
            <View style={d.navList}>
              {group.items.map(item => {
                const active = isActive(item.href);
                const badge = item.badgeKey === 'matches' ? unreadMatches : 0;
                return (
                  <Pressable
                    key={item.href}
                    style={d.navItem}
                    onPress={() => navigate(item.href)}
                  >
                    {active && <View style={d.activeDot} />}
                    <Ionicons
                      name={active ? item.icon : item.iconOff}
                      size={17}
                      color={C.text}
                      style={{ opacity: active ? 1 : 0.6 }}
                    />
                    <Text style={[d.navLabel, { color: C.text, opacity: active ? 1 : 0.85 }, active && d.navLabelActive]}>
                      {item.label}
                    </Text>
                    {badge > 0 && (
                      <View style={d.unreadBadge}>
                        <Text style={d.unreadBadgeText}>{badge}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* Profile + Settings — collapsible submenu, matches web exactly */}
        <View style={d.navList}>
          <Pressable
            style={d.navItem}
            onPress={() => setProfileMenuOpen(v => !v)}
          >
            {profileSettingsActive && <View style={d.activeDot} />}
            <Ionicons
              name="settings-outline"
              size={17}
              color={C.text}
              style={{ opacity: 0.6 }}
            />
            <Text style={[d.navLabel, { color: C.text, flex: 1 }]}>
              Profile + Settings
            </Text>
            <Ionicons
              name={profileMenuOpen ? 'chevron-down' : 'chevron-forward'}
              size={13}
              color={C.textDim}
            />
          </Pressable>

          {profileMenuOpen && (
            <View style={d.subMenu}>
              {PROFILE_SUB_ITEMS.map(sub => (
                <Pressable
                  key={sub.label}
                  style={d.subItem}
                  onPress={() => navigate(sub.href)}
                >
                  <Text style={[d.subItemText, { color: C.textMuted }]}>
                    {sub.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Our Socials */}
        <View style={[d.divider, { backgroundColor: C.border }]} />
        <Text style={[d.groupLabel, { color: C.textDim }]}>Our Socials</Text>
        <View style={d.socialRow}>
          {SOCIAL.map(s => (
            <Pressable
              key={s.label}
              style={d.socialIcon}
              onPress={() => Linking.openURL(s.url)}
              hitSlop={10}
            >
              <s.Icon color={C.textDim} />
            </Pressable>
          ))}
        </View>

      </ScrollView>

      {/* Footer: Logout only — matches web's shell-drawer-footer exactly */}
      <View style={[d.footer, { borderTopColor: C.border }]}>
        <Pressable
          style={({ pressed }) => [d.signOut, pressed && { opacity: 0.6 }]}
          onPress={signOut}
        >
          <Text style={[d.signOutText, { color: C.textMuted }]}>Logout</Text>
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
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  logo: { height: 26, width: 120 },
  closeBtn: { padding: 4 },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: FontFamily.bodyExtraBold,
    fontSize: 13,
  },
  profileName: {
    fontFamily: FontFamily.bodySemi,
    fontSize: 13,
    marginBottom: 4,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  tierBadgeText: {
    fontFamily: FontFamily.bodyExtraBold,
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  schoolBlock: { paddingHorizontal: 20, paddingBottom: 12, gap: 2 },
  schoolName: { fontFamily: FontFamily.bodySemi, fontSize: 12 },
  divisionText: { fontFamily: FontFamily.mono, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },

  signalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  signalDot: { width: 6, height: 6, borderRadius: 2 },
  signalText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },

  scrollContent: { paddingBottom: 8 },

  groupLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
  },
  navList: { paddingHorizontal: 20 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    position: 'relative',
  },
  navLabel: { fontFamily: FontFamily.body, fontSize: 16, letterSpacing: -0.1 },
  navLabelActive: { fontFamily: FontFamily.bodySemi },
  activeDot: {
    position: 'absolute',
    left: -10,
    top: '50%',
    marginTop: -1.5,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FF5341',
  },
  unreadBadge: {
    marginLeft: 'auto',
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 100,
    backgroundColor: '#71ff7e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 10, color: '#0a0a0a' },

  subMenu: { marginLeft: 29, marginBottom: 4 },
  subItem: { paddingVertical: 8 },
  subItemText: { fontFamily: FontFamily.body, fontSize: 14 },

  divider: { height: 1, marginHorizontal: 20, marginTop: 20, marginBottom: 4 },

  socialRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, alignItems: 'center', marginBottom: 12 },
  socialIcon: { padding: 6 },

  footer: { borderTopWidth: 1, paddingVertical: 14, paddingHorizontal: 20 },
  signOut: { paddingVertical: 4 },
  signOutText: { fontFamily: FontFamily.body, fontSize: 15 },
});
