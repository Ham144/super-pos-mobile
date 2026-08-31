import AsyncStorage from "@react-native-async-storage/async-storage";
import  { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ToastAndroid,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { getPrinterConfigs, printTest } from "../api";

const STORAGE_KEY = "printerConfigs";

const normalizePrinterConfig = (config) => ({
  ...config,
  _id: config?._id || config?.id,
  id: config?._id || config?.id,
  name: config?.name || "",
  tipePrinter: config?.tipePrinter || "",
  ipPrinter: config?.ipPrinter || "",
  portPrinter: String(config?.portPrinter || config?.port || ""),
  isDefault: Boolean(config?.isDefault),
});

const getConfigKey = (config) => String(config?._id || config?.id || "");

const PengaturanPrinterConfig = () => {
  const [printerConfigs, setPrinterConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTest, setLoadingTest] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);

  useEffect(() => {
    loadPrinterConfigs();
  }, []);

  const persistPrinterConfigs = async (configs, selectedId) => {
    const normalized = configs.map((config) => ({
      ...normalizePrinterConfig(config),
      isDefault: String(getConfigKey(config)) === String(selectedId),
    }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  };

  const applyPrinterConfigs = async (configs, preferredId) => {
    const normalized = configs.map(normalizePrinterConfig);
    if (!normalized.length) {
      setPrinterConfigs([]);
      setSelectedConfigId(null);
      setCurrentConfig(null);
      return;
    }

    const savedDefault = normalized.find((config) => config.isDefault);
    const selectedFromPreferred = preferredId
      ? normalized.find(
          (config) => String(getConfigKey(config)) === String(preferredId),
        )
      : null;
    const selectedId = getConfigKey(
      selectedFromPreferred || savedDefault || normalized[0],
    );

    const synced = normalized.map((config) => ({
      ...config,
      isDefault: String(getConfigKey(config)) === String(selectedId),
    }));

    const selected = synced.find(
      (config) => String(getConfigKey(config)) === String(selectedId),
    );

    setPrinterConfigs(synced);
    setSelectedConfigId(getConfigKey(selected || synced[0]));
    setCurrentConfig(selected || synced[0]);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
  };

  const loadPrinterConfigs = async () => {
    setLoading(true);
    try {
      const [savedRaw, serverConfigs] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        getPrinterConfigs(),
      ]);

      const savedConfigs = savedRaw ? JSON.parse(savedRaw) : [];
      const storedDefault = savedConfigs.find((config) => config.isDefault);
      const preferredId = getConfigKey(storedDefault);

      if (serverConfigs?.length) {
        await applyPrinterConfigs(serverConfigs, preferredId);
        return;
      }

      if (savedConfigs?.length) {
        await applyPrinterConfigs(savedConfigs, preferredId);
        return;
      }

      setPrinterConfigs([]);
      setSelectedConfigId(null);
      setCurrentConfig(null);
    } catch (error) {
      console.error("Error loading printer configs:", error);

      try {
        const savedRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const savedConfigs = savedRaw ? JSON.parse(savedRaw) : [];
        if (savedConfigs.length) {
          await applyPrinterConfigs(savedConfigs);
        }
      } catch (fallbackError) {
        console.error("Fallback printer config load failed:", fallbackError);
      }

      Alert.alert(
        "Error",
        "Gagal memuat konfigurasi printer dari server. Coba lagi nanti.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConfig = async (configId) => {
    const selected = printerConfigs.find(
      (config) => String(getConfigKey(config)) === String(configId),
    );

    if (!selected) {
      return;
    }

    setSelectedConfigId(getConfigKey(selected));
    setCurrentConfig(selected);

    try {
      const synced = await persistPrinterConfigs(
        printerConfigs,
        getConfigKey(selected),
      );
      setPrinterConfigs(synced);
      setCurrentConfig(
        synced.find(
          (config) =>
            String(getConfigKey(config)) === String(getConfigKey(selected)),
        ) || selected,
      );
      ToastAndroid.show(
        "Konfigurasi printer aktif sudah dipilih",
        ToastAndroid.SHORT,
      );
    } catch (error) {
      console.error("Error auto-saving printer selection:", error);
    }
  };

  const handleUseSelectedConfig = async () => {
    if (!currentConfig) {
      Alert.alert("Error", "Pilih konfigurasi printer terlebih dahulu");
      return;
    }

    setSavingSelection(true);
    try {
      const synced = await persistPrinterConfigs(
        printerConfigs,
        getConfigKey(currentConfig),
      );
      setPrinterConfigs(synced);
      setCurrentConfig(
        synced.find(
          (config) =>
            String(getConfigKey(config)) === String(getConfigKey(currentConfig)),
        ) || currentConfig,
      );

      ToastAndroid.show(
        "Konfigurasi printer aktif sudah dipilih",
        ToastAndroid.SHORT,
      );
    } catch (error) {
      console.error("Error saving printer selection:", error);
      Alert.alert("Error", "Gagal menyimpan konfigurasi printer aktif");
    } finally {
      setSavingSelection(false);
    }
  };

  const handleTestConfig = async () => {
    if (!currentConfig) {
      Alert.alert("Error", "Pilih konfigurasi printer terlebih dahulu");
      return;
    }

    setLoadingTest(true);
    try {
      await printTest(currentConfig);
      ToastAndroid.show("Berhasil test konfigurasi printer", ToastAndroid.LONG);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", error?.message || "Gagal test printer");
    } finally {
      setLoadingTest(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Pengaturan Printer</Text>
      <Text style={styles.subtitle}>
        Pilih konfigurasi printer yang sudah dibuat di web. CRUD printer hanya
        tersedia di web.
      </Text>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Konfigurasi Printer</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadPrinterConfigs}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#1d4ed8" />
            <Text style={styles.helperText}>Memuat daftar printer...</Text>
          </View>
        ) : printerConfigs.length > 0 ? (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedConfigId}
              onValueChange={handleSelectConfig}
              style={styles.picker}
            >
              {printerConfigs.map((config) => (
                <Picker.Item
                  key={getConfigKey(config)}
                  label={`${config.name}${config.isDefault ? " (Default)" : ""}`}
                  value={getConfigKey(config)}
                />
              ))}
            </Picker>
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Belum ada config printer</Text>
            <Text style={styles.helperText}>
              Tambahkan printer dari web terlebih dahulu.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detail Konfigurasi Aktif</Text>

        {currentConfig ? (
          <View style={styles.detailCard}>
            <DetailRow label="Nama" value={currentConfig.name} />
            <DetailRow label="Tipe" value={currentConfig.tipePrinter} />
            <DetailRow label="IP" value={currentConfig.ipPrinter} />
            <DetailRow label="Port" value={currentConfig.portPrinter} />
            <DetailRow
              label="Default"
              value={currentConfig.isDefault ? "Ya" : "Tidak"}
            />
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.helperText}>
              Tidak ada konfigurasi printer yang dipilih.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          disabled={!currentConfig || loadingTest}
          onPress={handleTestConfig}
          style={[
            styles.primaryButton,
            (!currentConfig || loadingTest) && styles.buttonDisabled,
          ]}
        >
          {loadingTest ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Test Printer</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          disabled={!currentConfig || savingSelection}
          onPress={handleUseSelectedConfig}
          style={[
            styles.secondaryButton,
            (!currentConfig || savingSelection) && styles.buttonDisabled,
          ]}
        >
          {savingSelection ? (
            <ActivityIndicator size="small" color="#1d4ed8" />
          ) : (
            <Text style={styles.secondaryButtonText}>Gunakan Config</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || "-"}</Text>
  </View>
);

export default PengaturanPrinterConfig;

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  refreshButton: {
    backgroundColor: "#dbeafe",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emptyBox: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  helperText: {
    fontSize: 13,
    color: "#6b7280",
  },
  detailCard: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#eff6ff",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  detailValue: {
    fontSize: 14,
    color: "#374151",
    flexShrink: 1,
    textAlign: "right",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#1d4ed8",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#1d4ed8",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
