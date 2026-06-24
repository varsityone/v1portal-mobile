import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface UpgradeSheetProps {
  visible: boolean;
  onClose: () => void;
  requiredPlan: 'pro' | 'elite';
  phaseNumber: number;
  phaseName: string;
}

export function UpgradeSheet({
  visible,
  onClose,
  requiredPlan,
  phaseNumber,
  phaseName,
}: UpgradeSheetProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(420)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 200,
          mass: 0.9,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 420,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  const planLabel = requiredPlan === 'pro' ? 'Pro' : 'Elite';

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.handle} />

        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={24} color={Colors.primary} />
        </View>

        <Text style={styles.phaseTag}>Phase {phaseNumber}</Text>
        <Text style={styles.title}>{phaseName}</Text>
        <Text style={styles.body}>
          Upgrade to{' '}
          <Text style={styles.planName}>{planLabel}</Text>
          {' '}to unlock this phase of The Gameplan and get access to the full recruiting system.
        </Text>

        <View style={styles.upgradeInfo}>
          <Text style={styles.upgradeInfoText}>
            {planLabel} plan is available at v1portal.com
          </Text>
        </View>

        <Pressable style={styles.dismissBtn} onPress={onClose}>
          <Text style={styles.dismissText}>Not now</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 14,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#2A2A2A',
  },
  handle: {
    width: 38,
    height: 4,
    backgroundColor: '#3A3A3A',
    borderRadius: 2,
    marginBottom: 28,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${Colors.primary}18`,
    borderWidth: 1,
    borderColor: `${Colors.primary}35`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  phaseTag: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 28,
  },
  planName: {
    color: Colors.text,
    fontWeight: '700',
  },
  upgradeInfo: {
    width: '100%',
    backgroundColor: `${Colors.primary}14`,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  upgradeInfoText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  dismissBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  dismissText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});
