import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  auth,
  configureGoogleSignIn,
  GoogleSignin,
  statusCodes,
  type FirebaseAuthTypes,
} from "../lib/app-firebase";
import {
  exchangeFirebaseIdTokenForSessionAbsolute,
  persistSessionFromExchange,
} from "../lib/session-exchange";
import { WEB_APP_ORIGIN } from "../config";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function toE164FromDigits(digits: string): string | null {
  const d = digitsOnly(digits);
  if (d.length !== 10) return null;
  return `+91${d}`;
}

function mapPhoneAuthError(code: string | undefined): string {
  switch (code) {
    case "auth/invalid-phone-number":
      return "That phone number is not valid. Use a 10-digit Indian mobile.";
    case "auth/invalid-verification-code":
      return "Invalid OTP. Check the SMS and try again.";
    case "auth/code-expired":
      return "That OTP expired. Tap 'Get OTP' again to resend.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/quota-exceeded":
      return "SMS quota exceeded for today. Try again later.";
    case "auth/missing-verification-code":
      return "Enter the 6-digit OTP first.";
    case "auth/network-request-failed":
      return "Network error. Check your internet and try again.";
    default:
      return "Couldn't verify the OTP. Try again.";
  }
}

type Props = {
  onLoggedIn: (redirectTo: "/home" | "/orders") => void;
};

export function LoginScreen({ onLoggedIn }: Props) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Holds the active signInWithPhoneNumber confirmation result.
  const confirmationRef =
    useRef<FirebaseAuthTypes.ConfirmationResult | null>(null);

  // Configure Google Sign-In once on mount.
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const phoneE164 = useMemo(() => toE164FromDigits(phone), [phone]);

  const handleGetOtp = async () => {
    if (!phoneE164) {
      Alert.alert("Invalid phone", "Enter a valid 10-digit mobile number.");
      return;
    }
    setSendingOtp(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneE164);
      confirmationRef.current = confirmation;
      setOtpSent(true);
      setOtp("");
    } catch (e) {
      const err = e as { code?: string; message?: string };
      Alert.alert(
        "Couldn't send OTP",
        mapPhoneAuthError(err.code) || err.message || "Try again.",
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!phoneE164) {
      Alert.alert("Invalid phone", "Enter a valid 10-digit mobile number.");
      return;
    }
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Enter the 6 digits from the SMS.");
      return;
    }
    const confirmation = confirmationRef.current;
    if (!confirmation) {
      Alert.alert("OTP not requested", "Tap 'Get OTP' first.");
      return;
    }
    setBusy(true);
    try {
      // Confirms the SMS code client-side via Firebase native auth.
      const credentialResult = await confirmation.confirm(otp.trim());
      const user = credentialResult?.user ?? auth().currentUser;
      if (!user) {
        throw new Error("No Firebase user after OTP confirmation.");
      }
      const idToken = await user.getIdToken(true);
      const exchanged = await exchangeFirebaseIdTokenForSessionAbsolute(
        WEB_APP_ORIGIN,
        idToken,
        phoneE164,
      );
      // We're done with Firebase locally — server will mint our session cookie.
      try {
        await auth().signOut();
      } catch {
        /* ignore */
      }
      if (!exchanged.ok) {
        Alert.alert("Sign-in failed", exchanged.message);
        return;
      }
      await persistSessionFromExchange(WEB_APP_ORIGIN, exchanged);
      onLoggedIn(exchanged.redirectTo);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      Alert.alert(
        "Sign-in failed",
        mapPhoneAuthError(err.code) || err.message || "Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    confirmationRef.current = null;
    setOtp("");
    setOtpSent(false);
    await handleGetOtp();
  };

  const handleGoogle = async () => {
    if (!phoneE164) {
      Alert.alert(
        "Phone required",
        "Enter your 10-digit mobile number before Google sign-in.",
      );
      return;
    }
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut().catch(() => undefined);
      const result = await GoogleSignin.signIn();
      // Library returns either { type, data } (newer) or the user object directly (older).
      const idToken =
        // @ts-expect-error narrow at runtime
        result?.data?.idToken ?? result?.idToken ?? null;
      if (!idToken) {
        Alert.alert("Google sign-in", "No ID token returned by Google.");
        return;
      }
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCred = await auth().signInWithCredential(googleCredential);
      const fresh = await userCred.user.getIdToken(true);
      const exchanged = await exchangeFirebaseIdTokenForSessionAbsolute(
        WEB_APP_ORIGIN,
        fresh,
        phoneE164,
      );
      try {
        await auth().signOut();
      } catch {
        /* ignore */
      }
      if (!exchanged.ok) {
        Alert.alert("Sign-in failed", exchanged.message);
        return;
      }
      await persistSessionFromExchange(WEB_APP_ORIGIN, exchanged);
      onLoggedIn(exchanged.redirectTo);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (err.code === statusCodes.IN_PROGRESS) return;
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          "Google Play Services",
          "Google Play Services not available or out of date.",
        );
        return;
      }
      Alert.alert(
        "Google sign-in",
        err.message || "Could not complete Google sign-in.",
      );
    } finally {
      setBusy(false);
    }
  };

  const primaryDisabled = busy || sendingOtp;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#0f172a", "#1e293b", "#334155"]}
          style={styles.hero}
        >
          <Text style={styles.brand}>Smart Kredit</Text>
          <Text style={styles.tag}>Login or create your account</Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.label}>Mobile number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.cc}>
              <Text style={styles.ccText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="9876543210"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                if (otpSent) {
                  // If user changes phone after sending OTP, force re-request.
                  setOtpSent(false);
                  setOtp("");
                  confirmationRef.current = null;
                }
              }}
              editable={!primaryDisabled}
            />
          </View>

          {!otpSent ? (
            <Pressable
              style={[styles.btnPrimary, primaryDisabled && styles.btnDisabled]}
              onPress={handleGetOtp}
              disabled={primaryDisabled}
            >
              {sendingOtp ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Get OTP</Text>
              )}
            </Pressable>
          ) : (
            <>
              <Text style={styles.label}>Enter OTP</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="6-digit OTP"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                editable={!busy}
              />
              <Pressable
                style={[styles.btnPrimary, busy && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Verify & Continue</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.btnGhost, busy && styles.btnDisabled]}
                onPress={handleResendOtp}
                disabled={busy}
              >
                <Text style={styles.btnGhostText}>Resend OTP</Text>
              </Pressable>
            </>
          )}

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <Pressable
            style={[styles.btnGoogle, busy && styles.btnDisabled]}
            onPress={handleGoogle}
            disabled={busy}
          >
            <Text style={styles.btnGoogleText}>Continue with Google</Text>
          </Pressable>

          <Text style={styles.hint}>
            By continuing you agree to Smart Kredit's Terms & Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  hero: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24 },
  brand: { fontSize: 28, fontWeight: "800", color: "#fff" },
  tag: { marginTop: 8, fontSize: 15, color: "#cbd5e1" },
  card: {
    marginHorizontal: 16,
    marginTop: -20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 8 },
  phoneRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  cc: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  ccText: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0f172a",
  },
  otpInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 4,
    color: "#0f172a",
    marginBottom: 16,
  },
  btnPrimary: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnGhost: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnGhostText: { color: "#475569", fontSize: 14, fontWeight: "600" },
  btnDisabled: { opacity: 0.6 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: "#64748b" },
  btnGoogle: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  btnGoogleText: { fontSize: 16, fontWeight: "600", color: "#334155" },
  hint: { marginTop: 16, fontSize: 12, color: "#64748b", textAlign: "center" },
});
