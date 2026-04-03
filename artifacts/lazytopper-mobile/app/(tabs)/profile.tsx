import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signInAsGuest, signOut } = useAuth();
  const { tier, isPremium, isTrialActive, isTrialExpired, daysLeftInTrial, startTrial } = useSubscription();
  const topPad = Platform.OS === "web" ? 67 : 0;

  if (!user) {
    return (
      <View style={[styles.authContainer, { backgroundColor: colors.background, paddingTop: topPad + insets.top }]}>
        <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
          <Feather name="book-open" size={32} color="#fff" />
        </View>
        <Text style={[styles.authTitle, { color: colors.foreground }]}>LazyTopper</Text>
        <Text style={[styles.authSubtitle, { color: colors.mutedForeground }]}>
          CBSE Class 10 Board Exam Prep
        </Text>

        <View style={styles.authButtons}>
          <Pressable
            style={[styles.authBtn, { backgroundColor: colors.primary }]}
            onPress={async () => {
              await signInAsGuest();
              await startTrial();
            }}
          >
            <Feather name="play" size={18} color="#fff" />
            <Text style={[styles.authBtnText, { color: "#fff" }]}>Start Free Trial</Text>
          </Pressable>

          <Pressable
            style={[styles.authBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={signInAsGuest}
          >
            <Feather name="compass" size={18} color={colors.foreground} />
            <Text style={[styles.authBtnText, { color: colors.foreground }]}>Explore as Guest</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const tierLabel = tier === "premium" ? "Premium" : tier === "trial" ? "Trial" : "Free";
  const tierColor = tier === "premium" ? colors.gold : tier === "trial" ? colors.green : colors.mutedForeground;

  const handleSignOut = () => {
    if (Platform.OS === "web") {
      signOut();
      return;
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {user.displayName[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <Text style={[styles.userName, { color: colors.foreground }]}>{user.displayName}</Text>
        {user.email && (
          <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
        )}
        {user.isGuest && (
          <View style={[styles.guestBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.guestText, { color: colors.mutedForeground }]}>Guest Account</Text>
          </View>
        )}
      </View>

      <View style={[styles.subCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.subHeader}>
          <View style={[styles.subIconBg, { backgroundColor: tierColor + "20" }]}>
            <Feather
              name={tier === "premium" ? "award" : tier === "trial" ? "clock" : "user"}
              size={20}
              color={tierColor}
            />
          </View>
          <View style={styles.subInfo}>
            <Text style={[styles.subTier, { color: colors.foreground }]}>{tierLabel} Plan</Text>
            {isTrialActive && (
              <Text style={[styles.subMeta, { color: colors.mutedForeground }]}>
                {daysLeftInTrial} day{daysLeftInTrial !== 1 ? "s" : ""} remaining
              </Text>
            )}
            {isTrialExpired && (
              <Text style={[styles.subMeta, { color: colors.destructive }]}>Trial expired</Text>
            )}
          </View>
        </View>

        {isTrialActive && (
          <View style={[styles.trialProgress, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.trialBar,
                { backgroundColor: colors.green, width: `${(daysLeftInTrial / 7) * 100}%` },
              ]}
            />
          </View>
        )}

        {!isPremium && (
          <Pressable style={[styles.upgradeBtn, { backgroundColor: colors.gold }]}>
            <Feather name="star" size={16} color="#1a1a2e" />
            <Text style={[styles.upgradeBtnText, { color: "#1a1a2e" }]}>Upgrade to Premium</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.menuSection}>
        {[
          { icon: "help-circle" as const, label: "Help & Support" },
          { icon: "shield" as const, label: "Privacy Policy" },
          { icon: "file-text" as const, label: "Terms of Service" },
          { icon: "info" as const, label: "About LazyTopper" },
        ].map((item) => (
          <Pressable
            key={item.label}
            style={[styles.menuRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name={item.icon} size={18} color={colors.mutedForeground} />
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.signOutBtn, { borderColor: colors.destructive }]}
        onPress={handleSignOut}
      >
        <Feather name="log-out" size={16} color={colors.destructive} />
        <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
      </Pressable>

      <View style={{ height: insets.bottom + 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  authContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  authTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
  },
  authSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  authButtons: {
    width: "100%",
    gap: 12,
  },
  authBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  authBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  profileCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
  },
  userName: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  userEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
  },
  guestBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  guestText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  subCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  subIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  subInfo: {
    flex: 1,
  },
  subTier: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  subMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  trialProgress: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 14,
  },
  trialBar: {
    height: 6,
    borderRadius: 3,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  upgradeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  menuSection: {
    marginBottom: 16,
    gap: 8,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  menuLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    flex: 1,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  signOutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
