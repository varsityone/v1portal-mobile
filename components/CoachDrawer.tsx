import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useAuth } from '../hooks/useAuth';
import { useCoachData } from '../hooks/useCoachData';
import { useTheme } from '../context/ThemeContext';

// ─── Nav structure — mirrors web's CoachShell 4-item nav exactly ─────────────

const NAV_ITEMS = [
  { label: 'Dashboard',      href: '/(coach)',            icon: 'grid'      as const, iconOff: 'grid-outline'      as const },
  { label: 'Find Athletes',  href: '/(coach)/match',      icon: 'heart'     as const, iconOff: 'heart-outline'     as const },
  { label: 'My Matches',     href: '/(coach)/matches',    icon: 'people'    as const, iconOff: 'people-outline'    as const },
  { label: 'Compliance',     href: '/(coach)/compliance', icon: 'shield'    as const, iconOff: 'shield-outline'    as const },
];

// ─── Social icons — same SVG paths as AppDrawer ───────────────────────────────

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
};

const LIGHT = {
  bg:        '#f0f0f0',
  surface:   '#ffffff',
  border:    'rgba(0,0,0,0.08)',
  text:      '#1a1b1d',
  textMuted: '#5a5d63',
  textDim:   '#9a9da2',
  primary:   '#833AB4',
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

  const isActive = (href: string) => {
    if (href === '/(coach)') return pathname === '/' || pathname === '/(coach)';
    const clean = href.replace('/(coach)', '');
    return pathname.startsWith(clean) && clean !== '';
  };

  const navigate = (href: string) => {
    props.navigation.closeDrawer();
    router.push(href as any);
  };

  const email = session?.user?.email ?? '';
  const fullName = coach?.full_name || '';
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

      {/* Coach profile header */}
      <View style={[d.profileHeader, { borderBottomColor: C.border }]}>
        {coach?.profile_photo_url ? (
          <Image source={{ uri: coach.profile_photo_url }} style={d.profilePhoto} />
        ) : (
          <View style={[d.profilePhoto, d.profilePhotoFallback, { backgroundColor: scheme === 'dark' ? '#ffffff' : '#000000' }]}>
            <Text style={[d.profilePhotoInitials, { color: scheme === 'dark' ? '#000000' : '#ffffff' }]}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[d.profileName, { color: C.text }]} numberOfLines={1}>{displayName}</Text>
          <Text style={[d.profileSchool, { color: C.textMuted }]} numberOfLines={1}>
            {coach?.school_name ?? email}
          </Text>
          {coach && (
            <View style={[d.badge, { backgroundColor: coach.verified ? 'rgba(113,255,126,0.14)' : 'rgba(245,158,11,0.14)' }]}>
              <Text style={[d.badgeText, { color: coach.verified ? '#16a34a' : '#D97706' }]}>
                {coach.verified ? 'VERIFIED COACH' : 'PENDING VERIFICATION'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Scrollable nav */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

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
        </View>

        {/* Divider */}
        <View style={[d.divider, { backgroundColor: C.border }]} />

        {/* Social links */}
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
          </View>
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={[d.footer, { borderTopColor: C.border }]}>
        <View style={d.userRow}>
          {coach?.profile_photo_url ? (
            <Image source={{ uri: coach.profile_photo_url }} style={d.avatar} />
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
  profileSchool: {
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
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

  divider: { height: 1, marginHorizontal: 16, marginVertical: 12 },

  socialSection: { marginBottom: 20 },
  socialRow: { flexDirection: 'row', gap: 0, paddingHorizontal: 20, alignItems: 'center' },
  socialIcon: { padding: 4 },

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
