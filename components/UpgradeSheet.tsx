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

interface PhaseGateSheetProps {
  visible: boolean;
  onClose: () => void;
  requiredPhaseNumber: number;
  requiredPhaseName: string;
  phaseNumber: number;
  phaseName: string;
}

export function UpgradeSheet({
  visible,
  onClose,
  requiredPhaseNumber,
  requiredPhaseName,
  phaseNumber,
  phaseName,
}: PhaseGateSheetProps) {
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

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.handle} />

        <View style={styles.iconCircle}>
          <Ionicons name="arrow-up-circle-outline" size={26} color={Colors.primary} />
        </View>

        <Text style={styles.phaseTag}>Phase {phaseNumber}</Text>
        <Text style={styles.title}>{phaseName}</Text>
        <Text style={styles.body}>
          Complete{' '}
          <Text style={styles.bold}>Phase {requiredPhaseNumber} — {requiredPhaseName}</Text>
          {' '}before moving on to this phase.
        </Text>

        <View style={styles.infoBox}>
          <Ionicons name="checkmark-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.infoText}>
            Finish Phase {requiredPhaseNumber} to continue your journey
          </Text>
        </View>

        <Pressable style={styles.dismissBtn} onPress={onClose}>
          <Text style={styles.dismissText}>Got it</Text>
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
    marginBottom: 24,
  },
  bold: {
    color: Colors.text,
    fontWeight: '700',
  },
  infoBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${Colors.primary}14`,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  infoText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
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
