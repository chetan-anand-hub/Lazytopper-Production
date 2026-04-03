import React, { useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";

import { useColors } from "@/hooks/useColors";
import { firebaseConfigured } from "@/services/firebaseConfig";

interface FirebasePhoneAuthProps {
  visible: boolean;
  onClose: () => void;
  onAuthenticated: (uid: string, displayName: string, phoneNumber: string) => void;
}

export function FirebasePhoneAuth({ visible, onClose, onAuthenticated }: FirebasePhoneAuthProps) {
  const colors = useColors();
  const webViewRef = useRef<WebView>(null);
  const [phoneNumber, setPhoneNumber] = useState("+91 ");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "webview">("phone");
  const [loading, setLoading] = useState(false);

  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "";
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "";
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "";
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "";

  const recaptchaHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
  <style>
    body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f5f5f5; font-family: sans-serif; }
    .status { text-align: center; padding: 20px; color: #666; }
  </style>
</head>
<body>
  <div id="recaptcha-container"></div>
  <div class="status" id="status">Initializing verification...</div>
  <script>
    const config = {
      apiKey: "${apiKey}",
      authDomain: "${authDomain}",
      projectId: "${projectId}",
      appId: "${appId}"
    };
    firebase.initializeApp(config);

    window.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.action === 'sendOtp') {
          sendOtp(data.phoneNumber);
        } else if (data.action === 'verifyOtp') {
          verifyOtp(data.code);
        }
      } catch(e) {}
    });

    let confirmationResult = null;

    function sendOtp(phoneNumber) {
      document.getElementById('status').textContent = 'Setting up verification...';
      const verifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
        callback: function() {}
      });
      firebase.auth().signInWithPhoneNumber(phoneNumber, verifier)
        .then(function(result) {
          confirmationResult = result;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'otpSent' }));
        })
        .catch(function(error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: error.message }));
        });
    }

    function verifyOtp(code) {
      if (!confirmationResult) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'No verification in progress' }));
        return;
      }
      confirmationResult.confirm(code)
        .then(function(result) {
          const user = result.user;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'authenticated',
            uid: user.uid,
            displayName: user.displayName || user.phoneNumber || 'Student',
            phoneNumber: user.phoneNumber || ''
          }));
        })
        .catch(function(error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: error.message }));
        });
    }
  </script>
</body>
</html>`;

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "otpSent") {
        setStep("otp");
        setLoading(false);
      } else if (data.type === "authenticated") {
        setLoading(false);
        onAuthenticated(data.uid, data.displayName, data.phoneNumber);
        handleClose();
      } else if (data.type === "error") {
        setLoading(false);
        Alert.alert("Error", data.message);
      }
    } catch (e) {
      setLoading(false);
    }
  };

  const handleSendOtp = () => {
    const cleanNumber = phoneNumber.replace(/\s/g, "");
    if (cleanNumber.length < 10) {
      Alert.alert("Invalid Number", "Please enter a valid phone number with country code.");
      return;
    }
    setLoading(true);
    setStep("webview");
    setTimeout(() => {
      webViewRef.current?.injectJavaScript(
        `window.postMessage('${JSON.stringify({ action: "sendOtp", phoneNumber: cleanNumber })}', '*'); true;`
      );
    }, 1500);
  };

  const handleVerifyOtp = () => {
    if (otpCode.length < 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit OTP code.");
      return;
    }
    setLoading(true);
    webViewRef.current?.injectJavaScript(
      `window.postMessage('${JSON.stringify({ action: "verifyOtp", code: otpCode })}', '*'); true;`
    );
  };

  const handleClose = () => {
    setStep("phone");
    setPhoneNumber("+91 ");
    setOtpCode("");
    setLoading(false);
    onClose();
  };

  if (!firebaseConfigured) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {step === "otp" ? "Enter OTP" : "Phone Sign-in"}
            </Text>
            <Pressable onPress={handleClose}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          {step === "phone" && (
            <>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Enter your phone number with country code
              </Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholder="+91 9876543210"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
              />
              <Pressable
                style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                <Text style={styles.btnText}>{loading ? "Sending..." : "Send OTP"}</Text>
              </Pressable>
            </>
          )}

          {(step === "webview" || step === "otp") && (
            <View style={styles.webviewContainer}>
              <WebView
                ref={webViewRef}
                source={{ html: recaptchaHtml }}
                onMessage={handleWebViewMessage}
                javaScriptEnabled
                style={step === "webview" && !loading ? styles.webviewVisible : styles.webviewHidden}
              />
            </View>
          )}

          {step === "otp" && (
            <>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Enter the 6-digit code sent to {phoneNumber}
              </Text>
              <TextInput
                style={[styles.input, styles.otpInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
              />
              <Pressable
                style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                <Text style={styles.btnText}>{loading ? "Verifying..." : "Verify & Sign In"}</Text>
              </Pressable>
              <Pressable style={styles.changeBtn} onPress={() => { setStep("phone"); setOtpCode(""); }}>
                <Text style={[styles.changeText, { color: colors.primary }]}>Change number</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 12,
  },
  input: {
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
  btn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  changeBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  changeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  webviewContainer: {
    height: 1,
    overflow: "hidden",
  },
  webviewVisible: {
    height: 100,
    opacity: 1,
  },
  webviewHidden: {
    height: 1,
    opacity: 0,
  },
});
