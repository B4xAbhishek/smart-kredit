import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { BottomTabBar, type AppTab } from "./src/components/BottomTabBar";
import { HomeScreen } from "./src/screens/HomeScreen";
import { OrdersScreen } from "./src/screens/OrdersScreen";
import { AccountScreen } from "./src/screens/AccountScreen";
import { WEB_APP_ORIGIN } from "./src/config";
import { hasWebSessionCookie, clearWebAppCookies } from "./src/lib/web-session-cookie";
import { openWebAppUrl } from "./src/lib/open-web-url";
import { LoginScreen } from "./src/screens/LoginScreen";

type Phase = "boot" | "login" | "app";

export default function App() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [offline, setOffline] = useState(false);
  const [tab, setTab] = useState<AppTab>("home");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch {
        /* dev reload / already hidden */
      }
      try {
        const has = await hasWebSessionCookie(WEB_APP_ORIGIN);
        if (!cancelled && has) {
          setPhase("app");
          setTab("home");
          await SplashScreen.hideAsync();
          return;
        }
      } catch {
        /* fall through */
      }
      if (!cancelled) {
        setPhase("login");
        await SplashScreen.hideAsync();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const down =
        state.isConnected === false || state.isInternetReachable === false;
      setOffline(down);
    });
    return () => unsub();
  }, []);

  const handleLoggedIn = useCallback((redirectTo: "/home" | "/orders") => {
    setPhase("app");
    setTab(redirectTo === "/orders" ? "orders" : "home");
  }, []);

  const handleSessionInvalid = useCallback(async () => {
    await clearWebAppCookies(WEB_APP_ORIGIN);
    setPhase("login");
  }, []);

  const openWebPathInBrowser = useCallback((pathOrUrl: string) => {
    void openWebAppUrl(WEB_APP_ORIGIN, pathOrUrl);
  }, []);

  const handleSignedOut = useCallback(async () => {
    await clearWebAppCookies(WEB_APP_ORIGIN);
    setPhase("login");
  }, []);

  if (phase === "boot") {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.bootText}>Starting…</Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top"]}>
        <StatusBar style="dark" />
        {offline ? (
          <View style={styles.offline}>
            <Text style={styles.offlineText}>
              No internet connection. Check your network and pull to refresh.
            </Text>
          </View>
        ) : null}
        {phase === "login" ? (
          <LoginScreen onLoggedIn={handleLoggedIn} />
        ) : (
          <View style={styles.appBody}>
            <View style={styles.screenWrap}>
              {tab === "home" ? (
                <HomeScreen
                  webOrigin={WEB_APP_ORIGIN}
                  onSessionInvalid={handleSessionInvalid}
                  onOpenWebPath={openWebPathInBrowser}
                  onGoOrders={() => setTab("orders")}
                />
              ) : null}
              {tab === "orders" ? (
                <OrdersScreen
                  webOrigin={WEB_APP_ORIGIN}
                  onSessionInvalid={handleSessionInvalid}
                  onOpenWebPath={openWebPathInBrowser}
                />
              ) : null}
              {tab === "account" ? (
                <AccountScreen
                  webOrigin={WEB_APP_ORIGIN}
                  onSessionInvalid={handleSessionInvalid}
                  onSignedOut={handleSignedOut}
                  onOpenWebPath={openWebPathInBrowser}
                />
              ) : null}
            </View>
            <BottomTabBar active={tab} onChange={setTab} />
          </View>
        )}

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  appBody: { flex: 1 },
  screenWrap: { flex: 1 },
  boot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eeecfa",
  },
  bootText: { marginTop: 12, fontSize: 15, color: "#6b7280" },
  offline: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#fcd34d",
  },
  offlineText: { fontSize: 13, color: "#92400e", textAlign: "center" },
});
