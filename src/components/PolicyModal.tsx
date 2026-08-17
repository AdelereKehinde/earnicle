import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
};

export default function PolicyModal({ visible, onClose, onAccept }: Props) {
  const [tab, setTab] = useState<'terms' | 'privacy'>('terms');

  const termsText = `Terms of Service\n\nWelcome to Earnicle. By using this app you agree to the following terms...\n\n1. Use responsibly.\n2. Do not abuse the service.\n\n(Replace with your real terms.)`;
  const privacyText = `Privacy Policy\n\nWe take your privacy seriously. This is a placeholder privacy policy describing how we collect and use data...\n\n(Replace with your real policy.)`;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.tabs}>
              <Pressable onPress={() => setTab('terms')} style={[styles.tab, tab === 'terms' && styles.tabActive]}>
                <Text style={[styles.tabText, tab === 'terms' && styles.tabTextActive]}>Terms of Service</Text>
              </Pressable>
              <Pressable onPress={() => setTab('privacy')} style={[styles.tab, tab === 'privacy' && styles.tabActive]}>
                <Text style={[styles.tabText, tab === 'privacy' && styles.tabTextActive]}>Privacy Policy</Text>
              </Pressable>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close"><Ionicons name="close" size={20} color="#666" /></Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.bodyText}>{tab === 'terms' ? termsText : privacyText}</Text>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onAccept} style={styles.acceptBtn}><Text style={styles.acceptText}>Accept</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '86%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  tabActive: { backgroundColor: '#F2F6FF' },
  tabText: { color: '#556' },
  tabTextActive: { color: '#0B3BFF', fontWeight: '700' },
  closeBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  closeText: { color: '#888' },
  body: { padding: 16 },
  bodyText: { color: '#333', lineHeight: 20 },
  footer: { padding: 12, borderTopWidth: 1, borderTopColor: '#EEE', alignItems: 'center' },
  acceptBtn: { backgroundColor: '#0B3BFF', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10 },
  acceptText: { color: '#fff', fontWeight: '700' },
});
