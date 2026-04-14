import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Zap } from "lucide-react-native";
import { authenticatedFetch } from "../lib/authenticated-fetch";

export type OrdersLoanRow = {
  id: string;
  productName: string;
  amount: string;
  status: string;
  statusVariant: "settled" | "active" | "pending";
  detailHref?: string;
};

type LoanTab = "ongoing" | "completed";

type Props = {
  webOrigin: string;
  onSessionInvalid: () => void;
  onOpenWebPath: (path: string) => void;
};

function statusColor(v: OrdersLoanRow["statusVariant"]) {
  if (v === "settled") return "#059669";
  return "#d97706";
}

export function OrdersScreen({ webOrigin, onSessionInvalid, onOpenWebPath }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loans, setLoans] = useState<OrdersLoanRow[]>([]);
  const [tab, setTab] = useState<LoanTab>("ongoing");
  const [error, setError] = useState<string | null>(null);

  const fetchLoans = useCallback(async () => {
    try {
      const res = await authenticatedFetch(webOrigin, "/api/orders");
      if (res.status === 401) {
        onSessionInvalid();
        return;
      }
      if (!res.ok) throw new Error("Failed to load orders");
      const json = (await res.json()) as { loans?: OrdersLoanRow[] };
      setLoans(json.loans ?? []);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [webOrigin, onSessionInvalid]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const { completed, ongoing } = useMemo(() => {
    const completedRows: OrdersLoanRow[] = [];
    const ongoingRows: OrdersLoanRow[] = [];
    for (const row of loans) {
      if (row.statusVariant === "settled") completedRows.push(row);
      else ongoingRows.push(row);
    }
    return { completed: completedRows, ongoing: ongoingRows };
  }, [loans]);

  const rows = tab === "completed" ? completed : ongoing;

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#4a7bff", "#5b6ef5", "#4f46e5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroGlow1} />
        <View style={styles.heroGlow2} />
        <Text style={styles.heroTitle}>Loan List</Text>

        <View style={styles.tabShell} accessibilityRole="tablist">
          <TouchableOpacity
            style={[styles.tabBtn, tab === "ongoing" && styles.tabBtnOn]}
            onPress={() => setTab("ongoing")}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "ongoing" }}
          >
            <Text style={[styles.tabText, tab === "ongoing" && styles.tabTextOn]}>
              Ongoing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "completed" && styles.tabBtnOn]}
            onPress={() => setTab("completed")}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "completed" }}
          >
            <Text style={[styles.tabText, tab === "completed" && styles.tabTextOn]}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchLoans();
            }}
          />
        }
      >
        {error ? (
          <Text style={styles.errText}>{error}</Text>
        ) : null}
        {rows.map((row) => (
          <View key={row.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardTitleRow}>
                <LinearGradient
                  colors={["#f0abfc", "#a855f7", "#4f46e5"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.zapIcon}
                >
                  <Zap size={20} color="white" fill="white" />
                </LinearGradient>
                <Text style={styles.productName} numberOfLines={2}>
                  {row.productName}
                </Text>
              </View>
              <Text style={[styles.status, { color: statusColor(row.statusVariant) }]}>
                {row.status}
              </Text>
            </View>
            <View style={styles.idRow}>
              <Text style={styles.meta}>ID:</Text>
              <Text style={styles.mono} numberOfLines={1}>
                {row.id}
              </Text>
            </View>
            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.meta}>Amount of money</Text>
                <Text style={styles.amount}>₹ {row.amount}</Text>
              </View>
              {row.statusVariant === "settled" || !row.detailHref ? null : (
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => onOpenWebPath(row.detailHref!)}
                >
                  <Text style={styles.detailBtnText}>Detail</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        {rows.length === 0 && !error ? (
          <Text style={styles.empty}>No loans in this tab yet.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "rgba(244, 244, 245, 0.9)" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 64,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  heroGlow1: {
    position: "absolute",
    right: -48,
    top: -48,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroGlow2: {
    position: "absolute",
    left: -40,
    bottom: -24,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  heroTitle: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: "700",
    color: "white",
  },
  tabShell: {
    marginTop: 28,
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "white",
    padding: 4,
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  tabBtnOn: {
    backgroundColor: "#4f46e5",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: { fontSize: 14, fontWeight: "600", color: "#71717a" },
  tabTextOn: { color: "white" },
  listScroll: { flex: 1, marginTop: -32 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "rgba(60, 21, 91, 0.08)",
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f4f4f5",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  zapIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  productName: { flex: 1, fontSize: 16, fontWeight: "700", color: "#18181b" },
  status: { fontSize: 14, fontWeight: "600", fontStyle: "italic" },
  idRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 8,
  },
  meta: { fontSize: 12, color: "#71717a" },
  mono: { flex: 1, fontSize: 12, color: "#71717a", fontFamily: "monospace", textAlign: "right" },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 16,
  },
  amount: { fontSize: 20, fontWeight: "700", color: "#18181b" },
  detailBtn: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  detailBtnText: { color: "white", fontWeight: "600", fontSize: 14 },
  empty: { textAlign: "center", marginTop: 32, fontSize: 14, color: "#71717a" },
  errText: { textAlign: "center", color: "#b91c1c", marginBottom: 8 },
});
