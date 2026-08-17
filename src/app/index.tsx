import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PolicyModal from '@/components/PolicyModal';
import { useAuth } from '@/providers/auth-provider';
import { authApi, getAcceptedTerms, setAcceptedTerms } from '../../lib/api';

const purple = '#6246F5';
type Screen = 'onboarding' | 'path' | 'signin' | 'signup' | 'verify' | 'forgot' | 'reset' | 'changed';

const onboarding = [
  { title: 'Welcome to Earnicle', body: 'A platform where readers and writers earn together.\nearn while you read. earn while you write', image: require('@/assets/images/writing.svg') },
  { title: 'Earn While You Read', body: 'Discover Amazing Content. Each Article You Read\nGives You Rewards, Plus You Decide How Much The\nAuthor Earns.', image: require('@/assets/images/phone.svg') },
  { title: 'Write, Publish, and Earn', body: 'Share Your Voice With The World. Get Rewarded Not\nJust By Views, But By Reader Engagement And\nAppreciation', image: require('@/assets/images/laptop.svg') },
];

function Brand() {
  return <View style={styles.brand}><Image source={require('@/assets/images/logo.png')} style={styles.brandImage} contentFit="contain" /></View>;
}

function PrimaryButton({ label, onPress, loading = false }: { label: string; onPress: () => void; loading?: boolean }) {
  return <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [styles.primary, (pressed || loading) && styles.pressed]}>
    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{label}</Text>}
  </Pressable>;
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry = false }: { label: string; value: string; onChangeText: (text: string) => void; placeholder: string; secureTextEntry?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <View style={styles.fieldWrap}><Text style={styles.label}>{label}</Text><View style={styles.inputWrap}><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#989898" secureTextEntry={secureTextEntry && !visible} autoCapitalize="none" style={styles.input} />{secureTextEntry && <Pressable onPress={() => setVisible(!visible)} hitSlop={12} style={styles.eyeBtn}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color="#7B70FF" /></Pressable>}</View></View>;
}

export default function Index() {
  const { ready, session, signIn, signUp } = useAuth();
  const router = useRouter();
  const params = typeof useSearchParams === 'function' ? useSearchParams() : {};
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);
  const [slide, setSlide] = useState(0);
  const [role, setRole] = useState('reader');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  
  const codeRefs = useRef<Array<TextInput | null>>([]);
  const shakeAnim = useMemo(() => new Animated.Value(0), []);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(16), []);
  const [shakeTick, setShakeTick] = useState(0);

  const fail = (message: string) => {
    setError(message);
    setShakeTick((t) => t + 1);
  };

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(16);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [screen, fadeAnim, slideAnim]);

  useEffect(() => {
    if (shakeTick === 0) return;
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -14, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 14, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeTick, shakeAnim]);

  const handleSetScreen = (newScreen: Screen) => {
    setScreenHistory([...screenHistory, screen]);
    setScreen(newScreen);
  };

  useEffect(() => {
    // Allow opening the login screen via URL param: /?screen=signin
    if (params?.screen && typeof params.screen === 'string') {
      const s = params.screen as Screen;
      if (['onboarding', 'path', 'signin', 'signup', 'verify', 'forgot', 'reset', 'changed'].includes(s)) {
        setScreen(s as Screen);
      }
    }
  }, [params]);

  const goBack = () => {
    if (screenHistory.length > 0) {
      const previousScreen = screenHistory[screenHistory.length - 1];
      setScreenHistory(screenHistory.slice(0, -1));
      setScreen(previousScreen);
      setError('');
      return true;
    }
    return false;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => backHandler.remove();
  }, [screenHistory, screen]);

  useEffect(() => {
    (async () => {
      try {
        const accepted = await getAcceptedTerms();
        setTermsAccepted(accepted);
      } catch {}
    })();
  }, []);

  // check last auth action (e.g., sign out) and set screen accordingly
  useEffect(() => {
    (async () => {
      try {
        const { getLastAuthAction, clearLastAuthAction } = await import('../../lib/api');
        const action = await getLastAuthAction();
        if (action === 'signed_out') {
          setScreen('signin');
          await clearLastAuthAction();
        }
      } catch {}
    })();
  }, []);

  // no local splash delay here — the root layout shows the Lottie splash while auth restores

  const signup = async () => {
    if (!fullName.trim() || !email.trim() || password.length < 8) return fail('Enter your name, email, and a password of at least 8 characters.');
    if (!termsAccepted) return fail('Please accept the terms and privacy policy.');
    setLoading(true);
    setError('');
    try {
      await signUp(fullName.trim(), email.trim(), password);
      router.push('/explore');
    } catch (err: any) {
      fail(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const signin = async () => {
    if (!email.trim() || !password) return fail('Enter your email and password.');
    setLoading(true);
    setError('');
    try {
      await signIn(email.trim(), password);
      router.push('/explore');
    } catch (err: any) {
      fail(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return fail('Enter your email address.');
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      handleSetScreen('verify');
    } catch (err: any) {
      fail(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (token = code.join('')) => {
    if (token.length !== 6) return fail('Enter the 6-digit code from your email.');
    setLoading(true);
    setError('');
    try {
      const res = await authApi.verifyOtp(email, token);
      setResetToken(res.access_token);
      handleSetScreen('reset');
    } catch (err: any) {
      fail(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await authApi.resendOtp(email.trim());
      setCode(['', '', '', '', '', '']);
      setError('');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (password.length < 8 || password !== confirmPassword) return fail('Passwords must match and contain at least 8 characters.');
    if (!resetToken) return fail('Enter the 6-digit code from your email.');
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(email, resetToken, password);
      setPassword('');
      setConfirmPassword('');
      setResetToken('');
      setCode(['', '', '', '', '', '']);
      handleSetScreen('changed');
    } catch (err: any) {
      fail(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const updateCode = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...code]; next[index] = digit; setCode(next); setError('');
    if (digit && index < 5) codeRefs.current[index + 1]?.focus();
    if (digit && index === 5) verify(next.join(''));
  };

  // If auth restored and there is a session, immediately go to dashboard (auto-login)
  useEffect(() => {
    if (ready && session) {
      // use replace to avoid back navigation to the login screen
      router.replace('/explore');
    }
  }, [ready, session, router]);

  // If the URL explicitly requests the signin screen (e.g., after logout), render auth immediately.
  if (params?.screen === 'signin' && !session) {
    // continue to render auth UI below without showing splash
  } else {
    // wait until auth ready — root layout renders the Lottie splash while restoring
    if (!ready) return null;
  }

  if (screen === 'onboarding') {
    const item = onboarding[slide];
    return <SafeAreaView style={styles.safe}><View style={styles.onboarding}><View style={styles.progress}>{[0, 1, 2].map((dot) => <View key={dot} style={[styles.progressDot, dot === slide && styles.progressActive]} />)}</View><View style={styles.onboardCopy}><Text style={styles.onboardTitle}>{item.title}</Text><Text style={styles.onboardBody}>{item.body}</Text></View><Image source={item.image} style={[styles.onboardImage, slide > 0 && styles.photoImage]} contentFit="contain" /><PrimaryButton label={slide === 2 ? 'Get started  →' : 'Next  →'} onPress={() => slide === 2 ? handleSetScreen('path') : setSlide(slide + 1)} /></View></SafeAreaView>;
  }
  if (screen === 'path') return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.pathPageContainer}><View style={styles.pathPage}><View><Text style={styles.pathTitle}>Choose Your Path</Text><Text style={styles.pathSub}>Select how you want to use Earnicle</Text></View><View style={styles.roleList}>{[
    ['reader', 'book', 'Reader', 'Earn rewards by reading quality content', ['Earn coins per articles', 'Curated content feed', 'Track reading stats']],
    ['writer', 'create', 'Writer', 'Get paid for your articles and stories', ['Earn per view and read', 'Built-In Editor', 'Analytic dashboard']],
    ['both', 'people', 'Both', 'Read and write to maximize earnings', ['Full access', 'Built-In Editor', 'Best value']],
  ].map(([value, icon, title, description, points]) => {
    const isReader = value === 'reader';
    const isSelected = role === value;
    return <Pressable key={value as string} onPress={() => setRole(value as string)} style={[styles.roleCard, isReader && styles.roleCardReader, !isReader && styles.roleCardWriter, isSelected && styles.roleSelected]}><View style={[styles.roleIcon, styles.roleIconPurple]}><Ionicons name={icon as any} size={32} color="#fff" /></View><View style={styles.roleContent}><Text style={styles.roleTitle}>{title}</Text><Text style={styles.roleDesc}>{description}</Text>{(points as string[]).map((point) => <Text key={point} style={styles.rolePoint}>• {point}</Text>)}</View><View style={[styles.checkContainer, isSelected && styles.checkContainerActive]}>{isSelected && <Text style={styles.check}>✓</Text>}</View></Pressable>;
  })}</View><PrimaryButton label="Continue" onPress={() => handleSetScreen('signup')} /></View></ScrollView></SafeAreaView>;

  return <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.authPage} keyboardShouldPersistTaps="handled">
    <Animated.View style={[styles.authForm, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] }]}>
    {screen === 'signin' && <><Text style={styles.authTitle}>Welcome back</Text><Text style={styles.authSub}>Sign in to continue earning</Text><Field label="Email" value={email} onChangeText={(text) => { setEmail(text); setError(''); }} placeholder="Your email" /><Field label="Password" value={password} onChangeText={(text) => { setPassword(text); setError(''); }} placeholder="Your password" secureTextEntry /><Pressable onPress={() => handleSetScreen('forgot')}><Text style={styles.forgot}>Forgot password?</Text></Pressable>{error ? <Text style={styles.error}>{error}</Text> : null}<PrimaryButton label="Sign In" onPress={signin} loading={loading} /><Pressable onPress={() => handleSetScreen('signup')}><Text style={styles.switchText}>New to Earnicle? <Text style={styles.link}>Create account</Text></Text></Pressable></>}
    {screen === 'signup' && <><Text style={styles.authTitle}>Join Earnicle</Text><Text style={styles.authSub}>Start your earning journey today</Text><Field label="Full Name" value={fullName} onChangeText={(text) => { setFullName(text); setError(''); }} placeholder="Enter your full name" /><Field label="Email" value={email} onChangeText={(text) => { setEmail(text); setError(''); }} placeholder="Your email" /><Field label="Password" value={password} onChangeText={(text) => { setPassword(text); setError(''); }} placeholder="Must be 8 characters" secureTextEntry /><Pressable onPress={() => setTermsAccepted(!termsAccepted)} style={styles.termsRow}><View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>{termsAccepted && <Ionicons name="checkmark" size={16} color="#fff" />}</View><Text style={styles.termsText}>I accept the <Text onPress={() => setShowPolicyModal(true)} style={styles.link}>terms and privacy policy</Text></Text></Pressable>{error ? <Text style={styles.error}>{error}</Text> : null}<PrimaryButton label="Create account" onPress={signup} loading={loading} /><Pressable onPress={() => handleSetScreen('signin')}><Text style={styles.switchText}>Already have an account? <Text style={styles.link}>Sign In</Text></Text></Pressable>
      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} onAccept={async () => { try { await setAcceptedTerms(true); setTermsAccepted(true); } catch {} setShowPolicyModal(false); }} />
    </>}
    {screen === 'verify' && <><Text style={styles.authTitle}>Please check your{`\n`}email</Text><Text style={styles.authSub}>We&apos;ve sent a code to <Text style={styles.strong}>{email}</Text></Text><View style={styles.codeRow}>{code.map((value, index) => <TextInput key={index} ref={(ref) => { codeRefs.current[index] = ref; }} value={value} onChangeText={(text) => updateCode(text, index)} onKeyPress={({ nativeEvent }) => nativeEvent.key === 'Backspace' && !value && index > 0 && codeRefs.current[index - 1]?.focus()} keyboardType="number-pad" maxLength={1} style={[styles.codeInput, !!error && styles.codeError]} />)}</View>{error ? <Text style={styles.error}>{error}</Text> : null}<PrimaryButton label="Verify" onPress={() => verify()} loading={loading} /><Pressable onPress={resend}><Text style={styles.resend}>Send code again</Text></Pressable></>}
    {screen === 'forgot' && <><Text style={styles.authTitle}>Forgot password?</Text><Text style={styles.authSub}>Don&apos;t worry! It happens. Please enter the email{`\n`}associated with your account.</Text><Field label="Email address" value={email} onChangeText={(text) => { setEmail(text); setError(''); }} placeholder="Enter your email address" /><View style={styles.forgotSpacing} />{error ? <Text style={styles.error}>{error}</Text> : null}<PrimaryButton label="Send code" loading={loading} onPress={forgot} /><Pressable onPress={() => handleSetScreen('signin')}><Text style={styles.switchText}>Remember password? <Text style={styles.link}>Sign in</Text></Text></Pressable></>}
    {screen === 'reset' && <>
      <Text style={styles.authTitle}>Reset password</Text>
      <Text style={styles.authSub}>Please type something you&apos;ll remember</Text>
      <Field label="New password" value={password} onChangeText={(text) => { setPassword(text); setError(''); }} placeholder="must be 8 characters" secureTextEntry />
      <Field label="Confirm new password" value={confirmPassword} onChangeText={(text) => { setConfirmPassword(text); setError(''); }} placeholder="repeat password" secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.resetButtonWrap}>
        <PrimaryButton label="Reset password" loading={loading} onPress={reset} />
      </View>
    </>}
    {screen === 'changed' && <>
      <Sparkle />
      <Text style={styles.authTitle}>Password changed</Text>
      <Text style={styles.authSub}>Your password has been changed{`\n`}successfully</Text>
      <PrimaryButton label="Back to login" onPress={() => handleSetScreen('signin')} />
    </>}
    </Animated.View>
  </ScrollView></SafeAreaView></KeyboardAvoidingView>;
}

function Sparkle() {
  const pop = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
  }, [pop]);
  return <Animated.Text style={[styles.sparkle, { opacity: pop, transform: [{ scale: pop }] }]}>✦</Animated.Text>;
}

// Splash moved to shared component `src/components/SplashScreen.tsx`

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' }, keyboard: { flex: 1, backgroundColor: '#fff' }, pressed: { opacity: .82 }, brand: { alignItems: 'center', height: 44 }, brandImage: { width: 128, height: 44 },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', gap: 8 },
  splashCard: { width: '92%', maxWidth: 520, backgroundColor: 'transparent', borderRadius: 18, padding: 20, alignItems: 'center' },
  lottieWrap: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderRadius: 16 },
  lottie: { width: 220, height: 220, backgroundColor: 'transparent' },
  lottieFallback: { marginVertical: 36 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  splashLogo: { width: 36, height: 36 },
  splashName: { fontSize: 28, fontWeight: '800', color: '#0B3BFF' },
  splashTag: { fontSize: 14, color: '#4A6FBF', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  onboarding: { flex: 1, paddingHorizontal: 28, alignItems: 'stretch', paddingTop: 52, paddingBottom: 28 }, progress: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 75, marginHorizontal: 20 }, progressDot: { height: 8, width: 87, borderRadius: 8, backgroundColor: '#E7E4FF' }, progressActive: { backgroundColor: purple }, onboardCopy: { alignItems: 'center', marginTop: 47 }, onboardTitle: { fontSize: 24, fontWeight: '700', color: '#050505', textAlign: 'center' }, onboardBody: { fontSize: 14, fontStyle: 'italic', lineHeight: 18, color: '#303030', textAlign: 'center', marginTop: 12 }, onboardImage: { flex: 1, width: '100%', marginVertical: 28 }, photoImage: { marginHorizontal: 24, width: '88%' }, primary: { minHeight: 56, borderRadius: 9, backgroundColor: purple, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }, primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  pathPageContainer: { flexGrow: 1 }, pathPage: { flex: 1, padding: 24, paddingTop: 32, gap: 20 }, pathTitle: { fontSize: 24, fontWeight: '700', color: '#050505' }, pathSub: { marginTop: 4, color: '#666', fontSize: 14 }, roleList: { gap: 16, flex: 1 }, roleCard: { minHeight: 146, borderRadius: 16, borderWidth: 1.5, borderColor: '#D1D1D1', padding: 16, flexDirection: 'row', alignItems: 'flex-start' }, roleCardReader: { backgroundColor: '#F5F4FF', borderColor: '#E9E8FF' }, roleCardWriter: { backgroundColor: '#FFE8E8', borderColor: '#FFCFD1' }, roleSelected: { borderColor: purple, borderWidth: 2 }, roleIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginRight: 14, flexShrink: 0 }, roleIconPurple: { backgroundColor: '#7B70FF' }, roleContent: { flex: 1, paddingTop: 2 }, roleTitle: { fontSize: 18, fontWeight: '600', color: '#050505' }, roleDesc: { fontSize: 14, marginTop: 6, marginBottom: 8, color: '#555', lineHeight: 20 }, rolePoint: { fontSize: 13, color: '#333', lineHeight: 22, marginTop: 2 }, checkContainer: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#D1D1D1', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8, marginTop: 2 }, checkContainerActive: { backgroundColor: purple, borderColor: purple }, check: { color: '#fff', fontSize: 16, fontWeight: '700' },
  authPage: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 52, paddingBottom: 36 }, authForm: { flexGrow: 1 }, authTitle: { marginTop: 62, textAlign: 'center', fontSize: 30, lineHeight: 38, fontWeight: '700', color: '#050505' }, authSub: { marginTop: 8, textAlign: 'center', fontSize: 16, color: '#505050', lineHeight: 21, marginBottom: 18 }, strong: { color: '#000', fontWeight: '600' }, fieldWrap: { marginTop: 14 }, label: { fontSize: 14, marginBottom: 6, color: '#1A1A1A' }, inputWrap: { justifyContent: 'center' }, eyeBtn: { position: 'absolute', right: 14, padding: 2, zIndex: 2 }, input: { height: 56, borderWidth: 1, borderColor: purple, borderRadius: 10, paddingHorizontal: 15, paddingRight: 46, color: '#111', fontSize: 16 }, termsRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 }, checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#D1D1D1', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }, checkboxChecked: { backgroundColor: purple, borderColor: purple }, termsText: { fontSize: 14, color: '#222', flex: 1 }, error: { color: '#EE3124', textAlign: 'center', marginVertical: 10 }, switchText: { textAlign: 'center', color: '#555', marginTop: 24, fontSize: 14 }, link: { color: purple, fontWeight: '700' }, forgot: { textAlign: 'right', marginTop: 12, marginBottom: 18 }, forgotSpacing: { height: 18 }, codeRow: { flexDirection: 'row', gap: 9, marginTop: 26, marginBottom: 44 }, codeInput: { flex: 1, height: 72, borderRadius: 14, borderWidth: 1, borderColor: '#D1D1D1', textAlign: 'center', fontSize: 28, color: '#050505' }, codeError: { borderColor: '#EE3124' }, resend: { marginTop: 44, textAlign: 'center', fontWeight: '700', color: '#505050' }, sparkle: { textAlign: 'center', marginTop: 82, fontSize: 74, color: '#000' }, home: { flex: 1, padding: 30, paddingTop: 52, alignItems: 'center' },
  resetButtonWrap: { marginTop: 18 },
});