import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signInAsGuest, signInWithGoogle, signInWithPhone, sendPhoneOtp, firebaseAvailable, signOut } = useAuth();
  const { tier, isPremium, isTrialActive, isTrialExpired, daysLeftInTrial, startTrial } = useSubscription();
  const topPad = Platform.OS === "web" ? 67 : 0;

  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("+91 ");
  const [otpCode, setOtpCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const handleSendOtp = async () => {
    const cleanNumber = phoneNumber.replace(/\s/g, "");
    if (cleanNumber.length < 10) {
      Alert.alert("Invalid Number", "Please enter a valid phone number with country code.");
      return;
    }
    setPhoneLoading(true);
    const vId = await sendPhoneOtp(cleanNumber);
    setPhoneLoading(false);
    if (vId) {
      setVerificationId(vId);
    }
  };

  const handleVerifyOtp = async () => {
    if (!verificationId || otpCode.length < 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit OTP code.");
      return;
    }
    setPhoneLoading(true);
    await signInWithPhone(verificationId, otpCode);
    setPhoneLoading(false);
    setPhoneModalVisible(false);
    setPhoneNumber("+91 ");
    setOtpCode("");
    setVerificationId(null);
  };

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
          {firebaseAvailable && (
            <>
              <Pressable
                style={[styles.authBtn, { backgroundColor: "#fff", borderColor: colors.border, borderWidth: 1 }]}
                onPress={signInWithGoogle}
              >
                <Feather name="mail" size={18} color="#4285F4" />
                <Text style={[styles.authBtnText, { color: "#333" }]}>Sign in with Google</Text>
              </Pressable>

              <Pressable
                style={[styles.authBtn, { backgroundColor: "#fff", borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setPhoneModalVisible(true)}
              >
                <Feather name="phone" size={18} color="#34A853" />
                <Text style={[styles.authBtnText, { color: "#333" }]}>Sign in with Phone</Text>
              </Pressable>
            </>
          )}

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

        <Modal
          visible={phoneModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPhoneModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {verificationId ? "Enter OTP" : "Phone Sign-in"}
                </Text>
                <Pressable onPress={() => {
                  setPhoneModalVisible(false);
                  setVerificationId(null);
                  setOtpCode("");
                }}>
                  <Feather name="x" size={22} color={colors.foreground} />
                </Pressable>
              </View>

              {!verificationId ? (
                <>
                  <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>
                    Enter your phone number with country code
                  </Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    placeholder="+91 9876543210"
                    placeholderTextColor={colors.mutedForeground}
                    autoFocus
                  />
                  <Pressable
                    style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: phoneLoading ? 0.6 : 1 }]}
                    onPress={handleSendOtp}
                    disabled={phoneLoading}
                  >
                    <Text style={styles.modalBtnText}>
                      {phoneLoading ? "Sending..." : "Send OTP"}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>
                    Enter the 6-digit code sent to {phoneNumber}
                  </Text>
                  <TextInput
                    style={[styles.modalInput, styles.otpInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="000000"
                    placeholderTextColor={colors.mutedForeground}
                    autoFocus
                  />
                  <Pressable
                    style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: phoneLoading ? 0.6 : 1 }]}
                    onPress={handleVerifyOtp}
                    disabled={phoneLoading}
                  >
                    <Text style={styles.modalBtnText}>
                      {phoneLoading ? "Verifying..." : "Verify & Sign In"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.resendBtn]}
                    onPress={() => {
                      setVerificationId(null);
                      setOtpCode("");
                    }}
                  >
                    <Text style={[styles.resendText, { color: colors.primary }]}>Change number</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  modalLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    marginBottom: 16,
  },
  otpInput: {
    textAlign: "center",
    letterSpacing: 8,
    fontSize: 24,
  },
  modalBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  resendBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  resendText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
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
