import React from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import WebView from "react-native-webview";

const MidtransOptionModal = ({
  visible,
  paymentUrl,
  onClose,
  onNavigationStateChange,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: "#111827",
            borderBottomWidth: 1,
            borderBottomColor: "#334155",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              Pembayaran Midtrans
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Text style={{ color: "#fca5a5", fontSize: 18, fontWeight: "700" }}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: "#cbd5e1", fontSize: 12, marginTop: 6 }}>
            Pembayaran tetap dibuka di dalam aplikasi.
          </Text>
        </View>

        {paymentUrl ? (
          <WebView
            source={{ uri: paymentUrl }}
            originWhitelist={["http://*", "https://*"]}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            setSupportMultipleWindows={false}
            javaScriptCanOpenWindowsAutomatically={false}
            sharedCookiesEnabled
            allowsInlineMediaPlayback
            onNavigationStateChange={onNavigationStateChange}
            onShouldStartLoadWithRequest={(request) => {
              const nextUrl = request?.url || "";
              if (
                nextUrl.startsWith("http://") ||
                nextUrl.startsWith("https://") ||
                nextUrl.startsWith("about:blank")
              ) {
                return true;
              }

              return false;
            }}
            renderLoading={() => (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#0f172a",
                }}
              >
                <ActivityIndicator size="large" color="#60a5fa" />
              </View>
            )}
            onError={(error) => {
              console.log("Midtrans WebView error:", error?.nativeEvent);
            }}
          />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            }}
          >
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={{ color: "#cbd5e1", marginTop: 12, textAlign: "center" }}>
              Menyiapkan halaman pembayaran...
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default MidtransOptionModal;
