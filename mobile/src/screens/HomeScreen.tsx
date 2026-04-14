import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Bell, CreditCard, Zap } from "lucide-react-native";
import { CONTACT_EMAIL } from "../constants";
import { authenticatedFetch } from "../lib/authenticated-fetch";

interface Recommendation {
  id: string;
  productName: string;
  loanAmountRupees: number;
  statusLabel: string;
  statusVariant: "settled" | "active" | "pending";
}

interface HomeData {
  recommendations: Recommendation[];
  featuredRange: [number, number];
}

const formatInr = (n: number) => {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(n);
};

type Props = {
  webOrigin: string;
  onSessionInvalid: () => void;
  onOpenWebPath: (path: string) => void;
  onGoOrders: () => void;
};

function statusStyle(v: Recommendation["statusVariant"]) {
  if (v === "settled") return { color: "#059669" as const };
  return { color: "#d97706" as const };
}

export function HomeScreen({
  webOrigin,
  onSessionInvalid,
  onOpenWebPath,
  onGoOrders,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await authenticatedFetch(webOrigin, "/api/home");
      if (response.status === 401) {
        onSessionInvalid();
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch home data");
      const json = (await response.json()) as HomeData;
      setData(json);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [webOrigin, onSessionInvalid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const [lo, hi] = data?.featuredRange ?? [2000, 80000];

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome</Text>
        <View style={styles.headerRow}>
          <View style={styles.logoRow}>
            <Image
              source={require("../../assets/splash-logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>Smart Kredit</Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            accessibilityLabel="Contact us by email"
          >
            <Bell size={20} color="#3c155b" strokeWidth={1.75} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.featuredCard}>
        <View style={styles.glowRight} />
        <View style={styles.glowBottom} />
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <CreditCard size={20} color="#1e1b2e" strokeWidth={2} />
          </View>
          <View style={styles.cardBadge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Smart Kredit</Text>
          </View>
        </View>

        <View style={styles.cardMain}>
          <View>
            <Text style={styles.cardLabel}>Loan amount</Text>
            <Text style={styles.cardAmount}>
              ₹{formatInr(lo)} – {formatInr(hi)}
            </Text>
          </View>
          <TouchableOpacity style={styles.repayBtn} onPress={onGoOrders}>
            <Text style={styles.repayBtnText}>Repay</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>More recommendations</Text>

      {error ? <Text style={styles.errText}>{error}</Text> : null}

      <View style={styles.recommendations}>
        {data?.recommendations.map((item) => (
          <View key={item.id} style={styles.recCard}>
            <View style={styles.recTop}>
              <LinearGradient
                colors={["#f0abfc", "#a855f7", "#4f46e5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.zapIcon}
              >
                <Zap size={18} color="white" fill="white" />
              </LinearGradient>
              <View style={styles.recTitleRow}>
                <Text style={styles.recName}>{item.productName}</Text>
                <Text style={[styles.statusText, statusStyle(item.statusVariant)]}>
                  {item.statusLabel}
                </Text>
              </View>
            </View>

            <View style={styles.idRow}>
              <Text style={styles.idLabel}>ID:</Text>
              <Text style={styles.idValue}>{item.id}</Text>
            </View>

            <View style={styles.recBottom}>
              <View>
                <Text style={styles.amountLabel}>Amount of money</Text>
                <Text style={styles.amountValue}>₹ {formatInr(item.loanAmountRupees)}</Text>
              </View>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => onOpenWebPath(`/order/${item.id}`)}
              >
                <Text style={styles.detailBtnText}>Detail</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <LinearGradient
          colors={["#6366f1", "#3c155b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.promoBanner}
        >
          <View style={styles.promoContent}>
            <Text style={styles.promoTitle}>Lightning borrowing</Text>
            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>Competitive rates · Quick approval</Text>
            </View>
          </View>
          <View style={styles.promoCircle}>
            <Text style={styles.promoInr}>₹</Text>
          </View>
        </LinearGradient>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errText: { color: "#b91c1c", marginBottom: 8, textAlign: "center" },
  header: { marginBottom: 24, paddingTop: 8 },
  welcomeText: { fontSize: 13, fontWeight: "500", color: "rgba(60, 21, 91, 0.55)", marginBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  logoImg: { width: 40, height: 40 },
  brandName: { fontSize: 18, fontWeight: "bold", color: "#3c155b", marginLeft: 8 },
  iconBtn: { padding: 10, borderRadius: 99, borderWidth: 1, borderColor: "rgba(60, 21, 91, 0.1)" },

  featuredCard: {
    backgroundColor: "#1e1b2e",
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  glowRight: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(99, 102, 241, 0.25)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -40,
    left: "25%",
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "rgba(60, 21, 91, 0.4)",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  cardIconBox: { backgroundColor: "#fbbf24", padding: 6, borderRadius: 8 },
  cardBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  badgeDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#6366f1", marginRight: 4 },
  badgeText: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  cardMain: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  cardLabel: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4 },
  cardAmount: { fontSize: 24, fontWeight: "bold", color: "white" },
  repayBtn: { backgroundColor: "#6366f1", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 99 },
  repayBtnText: { color: "white", fontWeight: "600", fontSize: 14 },

  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#3c155b", marginTop: 32, marginBottom: 16 },
  recommendations: { gap: 16 },
  recCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    shadowColor: "rgba(60, 21, 91, 0.08)",
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f4f4f5",
  },
  recTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  zapIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  recTitleRow: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recName: { fontSize: 15, fontWeight: "bold", color: "#18181b", flex: 1, marginRight: 8 },
  statusText: { fontSize: 11, fontWeight: "600", fontStyle: "italic" },
  idRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  idLabel: { fontSize: 12, color: "#71717a" },
  idValue: { fontSize: 12, color: "#71717a", fontFamily: "monospace" },
  recBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  amountLabel: { fontSize: 11, color: "#71717a", marginBottom: 4 },
  amountValue: { fontSize: 20, fontWeight: "bold", color: "#18181b" },
  detailBtn: { backgroundColor: "#6366f1", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  detailBtnText: { color: "white", fontWeight: "600", fontSize: 12 },

  promoBanner: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },
  promoContent: { maxWidth: "65%" },
  promoTitle: { color: "white", fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  promoBadge: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
  promoBadgeText: { color: "white", fontSize: 10, fontWeight: "500" },
  promoCircle: { width: 112, height: 112, borderRadius: 56, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center", position: "absolute", right: -8, bottom: -8 },
  promoInr: { color: "white", fontSize: 36, fontWeight: "600", opacity: 0.8 },
});
