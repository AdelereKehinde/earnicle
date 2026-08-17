import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/auth-provider';

const purple = '#5B4FE5';

export default function Dashboard() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const user = session?.user;

  const handleLogout = async () => {
    await signOut();
    try {
      // persist last action so index can show signin
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const api = require('../../lib/api');
      if (api && api.setLastAuthAction) await api.setLastAuthAction('signed_out');
    } catch {}
    router.replace('/?screen=signin');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.name}>{user?.full_name || 'Earnicle User'}</Text>
          </View>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color={purple} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Total Earnings</Text>
          <Text style={styles.heroAmount}>₦{Number(user?.total_earnings ?? 0).toFixed(2)}</Text>
          <Text style={styles.heroHint}>Keep reading and writing to earn more</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user?.total_stories ?? 0}</Text>
            <Text style={styles.statLabel}>Articles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user?.followers ?? 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user?.following ?? 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Membership</Text>
          {user?.is_pro_member ? (
            <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO MEMBER</Text></View>
          ) : (
            <Text style={styles.cardBody}>You are on the free plan.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent activity</Text>
          <Text style={styles.cardBody}>Nothing to show yet. Your reading and writing activity will appear here.</Text>
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBig, pressed && styles.pressed]}>
          <Text style={styles.logoutBigText}>Log out</Text>
        </Pressable>
        <Text style={styles.footer}>Signed in as {user?.username || 'you'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F6F9' },
  page: { padding: 20, paddingBottom: 40, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, color: '#888' },
  name: { fontSize: 22, fontWeight: '700', color: '#050505', marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#DDD', backgroundColor: '#fff' },
  logoutText: { color: purple, fontWeight: '600', fontSize: 14 },
  hero: { backgroundColor: purple, borderRadius: 18, padding: 22 },
  heroLabel: { color: '#DCD8FF', fontSize: 13 },
  heroAmount: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 6 },
  heroHint: { color: '#DCD8FF', fontSize: 13, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#EFEFEF', paddingVertical: 18, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#050505' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#EFEFEF', padding: 18 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#050505', marginBottom: 8 },
  cardBody: { fontSize: 14, color: '#666', lineHeight: 20 },
  proBadge: { alignSelf: 'flex-start', backgroundColor: '#EFEBFF', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6 },
  proBadgeText: { color: purple, fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
  logoutBig: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E0F5', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  logoutBigText: { color: purple, fontWeight: '700', fontSize: 16 },
  pressed: { opacity: 0.8 },
  footer: { textAlign: 'center', color: '#A0A0A0', fontSize: 12 },
});