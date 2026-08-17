import { Image } from 'expo-image';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.splash}>
      <View style={styles.splashCard}>
        <View style={styles.lottieWrap}>
          {Platform.OS === 'web' ? (
            (() => {
              try {
                // use lottie-react on web
                // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
                const Lottie = require('lottie-react').default;
                // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
                const animationData = require('../../assets/blue.json');
                // @ts-ignore allow web-only component
                return <Lottie animationData={animationData} loop autoplay style={styles.lottie} />;
              } catch (err) {
                return <ActivityIndicator size="large" color="#2563EB" style={styles.lottieFallback} />;
              }
            })()
          ) : (
            (() => {
              try {
                // dynamically require native Lottie to avoid Metro resolving it when it's not installed
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const mod = require('lottie-react-native');
                // prefer default export if present
                // @ts-ignore
                const NativeLottie = mod && (mod.default || mod);
                if (typeof NativeLottie === 'function' || typeof NativeLottie === 'object') {
                  // @ts-ignore
                  return <NativeLottie source={require('../../assets/blue.json')} autoPlay loop style={styles.lottie} />;
                }
                return <ActivityIndicator size="large" color="#2563EB" style={styles.lottieFallback} />;
              } catch (err) {
                return <ActivityIndicator size="large" color="#2563EB" style={styles.lottieFallback} />;
              }
            })()
          )}
        </View>
        <View style={styles.titleRow}>
          <Image source={require('@/assets/images/logo.png')} style={styles.splashLogo} contentFit="contain" />
          <Text style={styles.splashName}>Earnicle</Text>
        </View>
        <Text style={styles.splashTag}>Earn from reading & writing — get rewarded for time well spent</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', gap: 8 },
  splashCard: { width: '92%', maxWidth: 520, backgroundColor: 'transparent', borderRadius: 18, padding: 20, alignItems: 'center' },
  lottieWrap: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderRadius: 16 },
  lottie: { width: 220, height: 220, backgroundColor: 'transparent' },
  lottieFallback: { marginVertical: 36 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  splashLogo: { width: 36, height: 36 },
  splashName: { fontSize: 28, fontWeight: '800', color: '#0B3BFF' },
  splashTag: { fontSize: 14, color: '#4A6FBF', textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
