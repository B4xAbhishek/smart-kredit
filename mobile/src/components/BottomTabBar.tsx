import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FileText, Home, UserRound } from "lucide-react-native";

export type AppTab = "home" | "orders" | "account";

const items: Array<{
  id: AppTab;
  label: string;
  Icon: typeof Home;
}> = [
  { id: "home", label: "Home", Icon: Home },
  { id: "orders", label: "Order", Icon: FileText },
  { id: "account", label: "Account", Icon: UserRound },
];

type Props = {
  active: AppTab;
  onChange: (tab: AppTab) => void;
};

export function BottomTabBar({ active, onChange }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(8, insets.bottom),
          borderTopColor: "rgba(60, 21, 91, 0.1)",
        },
      ]}
    >
      <View style={styles.row}>
        {items.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <TouchableOpacity
              key={id}
              style={styles.item}
              onPress={() => onChange(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Icon
                size={24}
                color={isActive ? "#4f46e5" : "rgba(60, 21, 91, 0.45)"}
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <Text
                style={[styles.label, isActive ? styles.labelActive : styles.labelIdle]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    shadowColor: "rgba(60, 21, 91, 0.06)",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "stretch",
    paddingHorizontal: 8,
    maxWidth: 448,
    alignSelf: "center",
    width: "100%",
  },
  item: {
    minWidth: 72,
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
  labelActive: { color: "#4f46e5" },
  labelIdle: { color: "rgba(60, 21, 91, 0.45)" },
});
