import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Switch } from 'react-native';
import { ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { Card } from '../../../components/ui/Card';

export default function NotificationsScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const [emailMatches, setEmailMatches] = useState(true);
  const [pushMatches, setPushMatches] = useState(true);
  const [emailMessages, setEmailMessages] = useState(true);
  const [pushMessages, setPushMessages] = useState(true);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Notification Settings</Text>
      </View>

      <Card>
        <Text style={s.label}>Email Notifications</Text>
        <View style={s.row}>
          <Text style={s.text}>New Matches</Text>
          <Switch value={emailMatches} onValueChange={setEmailMatches} />
        </View>
        <View style={s.row}>
          <Text style={s.text}>New Messages</Text>
          <Switch value={emailMessages} onValueChange={setEmailMessages} />
        </View>
      </Card>

      <Card>
        <Text style={s.label}>Push Notifications</Text>
        <View style={s.row}>
          <Text style={s.text}>New Matches</Text>
          <Switch value={pushMatches} onValueChange={setPushMatches} />
        </View>
        <View style={s.row}>
          <Text style={s.text}>New Messages</Text>
          <Switch value={pushMessages} onValueChange={setPushMessages} />
        </View>
      </Card>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, backgroundColor: C.background },
    header: { marginBottom: 24 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },
    label: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text, marginBottom: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    text: { fontFamily: FontFamily.body, fontSize: 13, color: C.text },
  });
}
