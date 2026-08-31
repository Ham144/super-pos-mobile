import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ToastAndroid,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "@tanstack/react-query";
import { login, loginLdap, getBaseUrl, pingBackend } from "../api";
import { Settings, X, Smartphone, ShieldCheck } from "lucide-react-native";
import { BASE_URL, BACKEND_URLS } from "../constant";

const LoginScreen = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMethod, setAuthMethod] = useState("app");
  const [error, setError] = useState("");
  const [showBackendModal, setShowBackendModal] = useState(false);
  const [backendUrl, setBackendUrl] = useState("");

  const persistBackendUrl = async (url) => {
    const normalizedUrl = url?.trim();
    if (!normalizedUrl) {
      return;
    }

    setBackendUrl(normalizedUrl);
    await AsyncStorage.setItem("BASE_URL", JSON.stringify(normalizedUrl));
  };

  const BACKEND_TEMPLATES = {
    production: BACKEND_URLS.production,
    development: BACKEND_URLS.development,
  };

  const { data: isConnected } = useQuery({
    queryKey: ["ping", backendUrl],
    queryFn: () => pingBackend(backendUrl),
    enabled: !!backendUrl && showBackendModal,
    retry: 1,
  });

  useEffect(() => {
    const loadBackendUrl = async () => {
      const url = await getBaseUrl();
      setBackendUrl(url);
    };
    loadBackendUrl();
  }, []);

  const handleSaveBackend = async () => {
    try {
      await persistBackendUrl(backendUrl);
      ToastAndroid?.show("Backend URL berhasil disimpan", ToastAndroid.SHORT);
      setShowBackendModal(false);
    } catch (error) {
      ToastAndroid?.show("Gagal menyimpan Backend URL", ToastAndroid.SHORT);
    }
  };

  const handleAuthMethodChange = (method) => {
    setAuthMethod(method);
    setError("");
  };

  const { mutate: handleLogin, isPending: isLoginPending } = useMutation({
    mutationFn: async () => {
      const response = await login(username, password);
      return response;
    },
    onSuccess: (response) => {
      if (response?.data?.token) {
        AsyncStorage.setItem("token", response?.data?.token);
        onLoginSuccess();
      }
    },
    onError: (error) => {
      setError(error.message || "Terjadi kesalahan saat login");
    },
  });

  const { mutate: handleLoginLdap, isPending: isLoginLdapPending } =
    useMutation({
      mutationFn: async () => {
        const response = await loginLdap(username, password);
        return response;
      },
      onSuccess: (response) => {
        if (response?.data?.token) {
          AsyncStorage.setItem("token", response?.data?.token);
          onLoginSuccess();
        }
      },
      onError: (error) => {
        setError(error.message || "Terjadi kesalahan saat login LDAP");
      },
    });

  const isPending = isLoginPending || isLoginLdapPending;

  const handleSubmit = () => {
    setError("");
    if (authMethod === "app") {
      handleLogin();
    } else {
      handleLoginLdap();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View className="flex-row justify-between items-center mb-4">
          <Text style={styles.title}>Selamat Datang</Text>
          <TouchableOpacity
            onPress={() => setShowBackendModal(true)}
            className="p-2 rounded-full bg-gray-100"
          >
            <Settings size={20} color="#4B5563" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Pilih metode login dan masuk</Text>

        <View style={styles.authMethodSwitcher}>
          <TouchableOpacity
            style={[
              styles.authMethodButton,
              authMethod === "app" && styles.authMethodButtonActive,
            ]}
            onPress={() => handleAuthMethodChange("app")}
          >
            <Smartphone
              size={14}
              color={authMethod === "app" ? "#1D4ED8" : "#6B7280"}
            />
            <Text
              style={[
                styles.authMethodText,
                authMethod === "app" && styles.authMethodTextActive,
              ]}
            >
              App Account
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.authMethodButton,
              authMethod === "ldap" && styles.authMethodButtonActive,
            ]}
            onPress={() => handleAuthMethodChange("ldap")}
          >
            <ShieldCheck
              size={14}
              color={authMethod === "ldap" ? "#1D4ED8" : "#6B7280"}
            />
            <Text
              style={[
                styles.authMethodText,
                authMethod === "ldap" && styles.authMethodTextActive,
              ]}
            >
              LDAP / SSO
            </Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.inputLabel}>
          {authMethod === "ldap"
            ? "Active Directory Username"
            : "Username"}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={
            authMethod === "ldap"
              ? "Masukkan username Active Directory"
              : "Username"
          }
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          keyboardType="default"
        />

        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.buttonText}>
              Masuk via {authMethod === "ldap" ? "LDAP" : "App"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showBackendModal}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="w-[90%] max-w-md bg-white rounded-xl p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">
                Konfigurasi Backend
              </Text>
              <TouchableOpacity
                onPress={() => setShowBackendModal(false)}
                className="p-2"
              >
                <Text>
                  <X size={20} color="#4B5563" />
                </Text>
              </TouchableOpacity>
            </View>

            <View
              className={`p-3 rounded-lg mb-4 ${
                isConnected ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <TouchableOpacity
                className={`flex  items-center rounded-lg ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
                disabled={true}
              >
                <Text className="text-center text-white font-medium">
                  Indikator
                </Text>
                <Text className="text-center text-white font-medium">
                  {isConnected ? "Terhubung" : "Tidak Terhubung"}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Backend URL
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white"
                value={backendUrl}
                onChangeText={setBackendUrl}
                placeholder="http://your-backend-url:port"
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Quick Switch
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  className="px-3 py-2 bg-green-500 rounded-lg"
                  onPress={() => persistBackendUrl(BACKEND_TEMPLATES.production)}
                >
                  <Text className="text-white font-medium">Production</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="px-3 py-2 bg-blue-950 rounded-lg"
                  onPress={() =>
                    persistBackendUrl(BACKEND_TEMPLATES.development)
                  }
                >
                  <Text className="text-white font-medium">Development</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                className={`flex-1 justify-center p-3 rounded-lg ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
                onPress={() => persistBackendUrl(BASE_URL)}
              >
                <Text className="text-center text-white font-medium">
                  Reset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 text-center text-white bg-blue-950 rounded-lg p-3`}
                onPress={handleSaveBackend}
              >
                {isConnected ? (
                  <Text className="text-center text-white font-bold">
                    Simpan
                  </Text>
                ) : (
                  <Text className="text-center text text-white font-medium">
                    Tetap Simpan
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  card: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  authMethodSwitcher: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  authMethodButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  authMethodButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  authMethodText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  authMethodTextActive: {
    color: "#1D4ED8",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#ef4444",
    marginBottom: 16,
    textAlign: "center",
  },
});

export default LoginScreen;
