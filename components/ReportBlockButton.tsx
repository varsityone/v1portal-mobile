import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { REPORT_REASONS, ReportContext, blockUser, reportUser } from '../lib/moderation';

type Props = {
  // coach_accounts.id when the viewer is an athlete, athletes.id when the viewer is a coach.
  targetId: string | null | undefined;
  targetName: string | null | undefined;
  context: ReportContext;
  // Called after a block succeeds; the pair's thread is gone by then, so
  // callers navigate away.
  onBlocked: () => void;
  color?: string;
};

function pick(title: string, message: string | undefined, options: string[], destructiveIndex?: number): Promise<number | null> {
  return new Promise(resolve => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, message, options: [...options, 'Cancel'], cancelButtonIndex: options.length, destructiveButtonIndex: destructiveIndex },
        i => resolve(i === options.length ? null : i),
      );
    } else {
      Alert.alert(title, message, [
        ...options.map((o, i) => ({ text: o, style: i === destructiveIndex ? 'destructive' as const : 'default' as const, onPress: () => resolve(i) })),
        { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
      ], { cancelable: true, onDismiss: () => resolve(null) });
    }
  });
}

// "..." menu with Report and Block for any coach <-> athlete surface
// (App Store guideline 1.2).
export default function ReportBlockButton({ targetId, targetName, context, onBlocked, color = '#fff' }: Props) {
  const [busy, setBusy] = useState(false);
  const name = targetName?.trim() || 'this user';

  const confirmBlock = () => new Promise<boolean>(resolve => {
    Alert.alert(`Block ${name}?`, "You won't see each other's profiles, matches or messages, and they can't contact you. They won't be notified.", [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Block', style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });

  const open = async () => {
    if (!targetId || busy) return;
    const action = await pick(name, undefined, [`Report ${name}`, `Block ${name}`], 1);
    if (action === null) return;

    if (action === 1) {
      if (!(await confirmBlock())) return;
      setBusy(true);
      try {
        await blockUser(targetId);
        Alert.alert('Blocked', `You won't see ${name} anymore.`, [{ text: 'OK', onPress: onBlocked }]);
      } catch (e) {
        Alert.alert('Could not block', e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setBusy(false);
      }
      return;
    }

    const reasonIdx = await pick(`Report ${name}`, "Why are you reporting them? They won't know you reported them.", [...REPORT_REASONS]);
    if (reasonIdx === null) return;
    const alsoBlock = await new Promise<boolean>(resolve => {
      Alert.alert(`Also block ${name}?`, "Blocking hides your conversation and stops them from contacting you.", [
        { text: 'Report only', onPress: () => resolve(false) },
        { text: 'Report and block', style: 'destructive', onPress: () => resolve(true) },
      ], { cancelable: true, onDismiss: () => resolve(false) });
    });
    setBusy(true);
    try {
      await reportUser(targetId, context, REPORT_REASONS[reasonIdx], alsoBlock);
      Alert.alert('Report sent', 'Thanks for letting us know. Our team will review it within 24 hours.', [
        { text: 'OK', onPress: alsoBlock ? onBlocked : undefined },
      ]);
    } catch (e) {
      Alert.alert('Could not send report', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`More options for ${name}`}
      hitSlop={10}
      disabled={!targetId || busy}
      onPress={open}
      style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
    >
      <Ionicons name="ellipsis-horizontal" size={20} color={color} />
    </Pressable>
  );
}
