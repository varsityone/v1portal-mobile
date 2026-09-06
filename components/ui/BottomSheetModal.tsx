import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Generic slide-up sheet, modeled on UpgradeSheet.tsx's animation/backdrop
// approach — used for the recruit-detail sheet, template picker, and any
// other new sheet-style surface.
export function BottomSheetModal({ visible, onClose, children }: BottomSheetModalProps) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(420)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200, mass: 0.9 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 420, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  return (
    <Modal transparent visible={modalVisible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.handle} />
        {children}
      </Animated.View>
    </Modal>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: C.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingTop: 14,
      paddingBottom: 40,
      paddingHorizontal: 20,
      alignItems: 'center',
      borderTopWidth: 1,
      borderColor: C.border,
      maxHeight: '85%',
    },
    handle: { width: 38, height: 4, backgroundColor: C.border2, borderRadius: 2, marginBottom: 18 },
  });
}
