import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronRight,
  FileText,
  LogOut,
  Mail,
  Scale,
  Shield,
  UserRound,
} from "lucide-react-native";
import { authenticatedFetch } from "../lib/authenticated-fetch";
import { clearWebAppCookies } from "../lib/web-session-cookie";

type AccountPayload = {
  accountLabel: string;
  showAdminLink: boolean;
  contactEmail: string;
};

type Props = {
  webOrigin: string;
  onSessionInvalid: () => void;
  onSignedOut: () => void;
  onOpenWebPath: (path: string) => void;
};

export function AccountScreen({
  webOrigin,
  onSessionInvalid,
  onSignedOut,
  onOpenWebPath,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AccountPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authenticatedFetch(webOrigin, "/api/account");
      if (res.status === 401) {
        onSessionInvalid();
        return;
      }
      if (!res.ok) throw new Error("Failed to load account");
      const json = (await res.json()) as AccountPayload;
      if (json.accountLabel === "Account —") {
        onSessionInvalid();
        return;
      }
      setData(json);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [webOrigin, onSessionInvalid]);

  useEffect(() => {
    load();
  }, [load]);

  const logout = useCallback(async () => {
    Alert.alert("Log out", "You will need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await authenticatedFetch(webOrigin, "/api/auth/logout", {
              method: "POST",
            });
          } catch {
            /* still clear local state */
          }
          await clearWebAppCookies(webOrigin);
          onSignedOut();
        },
      },
    ]);
  }, [webOrigin, onSignedOut]);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const contactEmail = data?.contactEmail ?? "kreditsmart604@gmail.com";

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <LinearGradient
        colors={["#3b5bdb", "#4f6ef7", "#4f46e5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroGlow1} />
        <View style={styles.heroGlow2} />
        <View style={styles.avatarRing}>
          <UserRound size={40} color="white" strokeWidth={1.75} />
        </View>
        <Text style={styles.label}>{data?.accountLabel ?? "—"}</Text>
      </LinearGradient>

      <View style={styles.promoWrap}>
        <LinearGradient
          colors={["#38bdf8", "#0ea5e9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.promo}
        >
          <Text style={styles.promoText}>Loans That Keep You Moving</Text>
          <View style={styles.promoAccent} />
        </LinearGradient>
      </View>

      {error ? <Text style={styles.errText}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>Common functions</Text>

      <View style={styles.nav}>
        {data?.showAdminLink ? (
          <TouchableOpacity
            style={styles.row}
            onPress={() => onOpenWebPath("/admin")}
          >
            <View style={[styles.iconCircle, styles.iconPlum]}>
              <Shield size={20} color="white" strokeWidth={2} />
            </View>
            <Text style={styles.rowLabel}>Admin</Text>
            <View style={styles.chev}>
              <ChevronRight size={16} color="#4f46e5" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.row}
          onPress={() => Linking.openURL(`mailto:${contactEmail}`)}
        >
          <View style={[styles.iconCircle, styles.iconIndigo]}>
            <Mail size={20} color="white" strokeWidth={2} />
          </View>
          <Text style={styles.rowLabel}>Contact Us</Text>
          <View style={styles.chev}>
            <ChevronRight size={16} color="#4f46e5" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => onOpenWebPath("/privacy")}
        >
          <View style={[styles.iconCircle, styles.iconIndigo]}>
            <FileText size={20} color="white" strokeWidth={2} />
          </View>
          <Text style={styles.rowLabel}>Privacy Policy</Text>
          <View style={styles.chev}>
            <ChevronRight size={16} color="#4f46e5" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => onOpenWebPath("/terms")}
        >
          <View style={[styles.iconCircle, styles.iconIndigo]}>
            <Scale size={20} color="white" strokeWidth={2} />
          </View>
          <Text style={styles.rowLabel}>Terms & Conditions</Text>
          <View style={styles.chev}>
            <ChevronRight size={16} color="#4f46e5" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={logout}>
          <View style={[styles.iconCircle, styles.iconIndigo]}>
            <LogOut size={20} color="white" strokeWidth={2} />
          </View>
          <Text style={styles.rowLabel}>Logout</Text>
          <View style={styles.chev}>
            <ChevronRight size={16} color="#4f46e5" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "rgba(244, 244, 245, 0.9)" },
  content: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 64,
    overflow: "hidden",
  },
  heroGlow1: {
    position: "absolute",
    right: -64,
    top: 0,
    width: 224,
    height: 224,
    borderRadius: 112,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  heroGlow2: {
    position: "absolute",
    left: -40,
    bottom: 0,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  avatarRing: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
    color: "white",
  },
  promoWrap: { marginTop: -40, paddingHorizontal: 16, zIndex: 1 },
  promo: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  promoText: {
    flex: 1,
    maxWidth: "58%",
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  promoAccent: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  sectionTitle: {
    marginTop: 32,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "700",
    color: "#18181b",
  },
  nav: { marginTop: 16, paddingHorizontal: 16, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#f4f4f5",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  iconPlum: { backgroundColor: "#3c155b" },
  iconIndigo: { backgroundColor: "#4f46e5" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: "#18181b" },
  chev: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(79, 70, 229, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  errText: { textAlign: "center", color: "#b91c1c", marginTop: 12, paddingHorizontal: 16 },
});
