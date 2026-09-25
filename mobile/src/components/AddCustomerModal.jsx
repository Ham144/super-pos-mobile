import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ToastAndroid,
  Platform,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { useCurrentBill } from "../store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteCustomer, getCustomerList } from "../api";
import { MousePointer2, Pencil, Trash2 } from "lucide-react-native";
import { enumCustomerDialog } from "../dir/enumList";

const CustomerFormModal = ({
  customerDialogPurpose,
  onClose,
  title,
  callback,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [currentTab, setCurrentTab] = useState("pick"); //create || pick

  const {
    customerEmail: customerEmailZustand,
    customerName: customerNameZustand,
    customerPhone: customerPhoneZustand,
    customerJenisKel,
    customerAddress,
    setCustomerEmail: setCustomerEmailZustand,
    setCustomerName: setCustomerNameZustand,
    setCustomerPhone: setCustomerPhoneZustand,
    setCustomerJenisKel,
    setCustomerAddress,
    futureVoucher,
    setFutureVoucher,
  } = useCurrentBill();

  //tanstack
  const queryClient = useQueryClient();
  const { data: customerOffline } = useQuery({
    queryFn: getCustomerList,
    queryKey: ["customer"],
  });
  const { mutateAsync: handleDeleteCustomer } = useMutation({
    mutationFn: (customerToDel) =>
      deleteCustomer(customerToDel, customerOffline),
    onSuccess: () => {
      queryClient.invalidateQueries(["customer"]);
    },
    onError: (err) => console.log(err),
  });

  const handleSubmit = async () => {
    if (customerDialogPurpose === enumCustomerDialog.VOUCHER) {
      // Validate email
      if (!customerEmail && !customerPhone) {
        Alert.alert(
          "Email/telp salah satu diperlukan",
          "Email atau nomor telp wajib di isi"
        );
        return;
      }

      // Set customer data
      setCustomerAddress(address);
      setCustomerJenisKel(gender);
      setCustomerEmailZustand(customerEmail);
      setCustomerNameZustand(customerName);
      setCustomerPhoneZustand(customerPhone);

      // Close modal and continue flow
      onClose();

      // Save to AsyncStorage
      try {
        if (!customerOffline?.length) {
          const initialCustomer = {
            email: customerEmail,
            name: customerName,
            phone: customerPhone,
            jenisKelamin: gender,
            alamat: address,
          };
          await AsyncStorage.setItem(
            "customer",
            JSON.stringify([initialCustomer])
          );
        } else {
          const foundCustomer = customerOffline?.find(
            (customer) => customer?.email == customerEmail
          );
          console.log("editing");
          if (foundCustomer) {
            foundCustomer.name = customerName;
            foundCustomer.phone = customerPhone;
            foundCustomer.jenisKelamin = gender;
            foundCustomer.alamat = address;
            await AsyncStorage.setItem(
              "customer",
              JSON.stringify(customerOffline)
            );
          } else {
            console.log("new customer");
            customerOffline.push({
              email: customerEmail,
              name: customerName,
              phone: customerPhone,
              jenisKelamin: gender,
              alamat: address,
            });

            await AsyncStorage.setItem(
              "customer",
              JSON.stringify(customerOffline)
            );
          }
        }

        // Clear form
        setCustomerEmail("");
        setCustomerName("");
        setCustomerPhone("");
        setGender("");
        setAddress("");

        // Close modal and execute callback immediately
        onClose();
      } catch (error) {
        console.error("Error saving customer:", error);
        ToastAndroid?.show("Terjadi kesalahan", ToastAndroid.SHORT);
      }
    } else {
      const customerOffline = JSON.parse(
        await AsyncStorage.getItem("customer")
      );
      if (!customerOffline) {
        const customerOffline = {
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
          jenisKelamin: gender,
          alamat: address,
        };
        await AsyncStorage.setItem(
          "customer",
          JSON.stringify([customerOffline])
        );
      } else {
        customerOffline?.push({
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
          jenisKelamin: gender,
          alamat: address,
        });
        await AsyncStorage.setItem("customer", JSON.stringify(customerOffline));
      }
      onClose();
    }
  };

  const handleEditCustomer = async (cust) => {
    setCustomerName(cust?.name || "");
    setCustomerEmail(cust?.email || "");
    setCustomerPhone(cust?.phone || "");
    setGender(cust?.jenisKelamin || "");
    setAddress(cust?.alamat || "");
    setCurrentTab("create");
  };

  const handlePressTabCustomerList = async () => {
    try {
      if (!customerOffline?.length) {
        queryClient.invalidateQueries(["customer"]);
      }
      setCurrentTab("pick");
    } catch (error) {
      console.log(error);
      if (Platform.OS === "android") {
        ToastAndroid.show("Terjadi kesalahan", ToastAndroid.SHORT);
      }
    }
  };

  const handlePickCustomer = async (customer) => {
    try {
      setCustomerNameZustand(customer?.name || "");
      setCustomerEmailZustand(customer?.email || "");
      setCustomerPhoneZustand(customer?.phone || "");
      setCustomerJenisKel(customer?.jenisKelamin || "");
      setCustomerAddress(customer?.alamat || "");
      //lanjutkan flow
      onClose();
    } catch (error) {
      console.log(error);
      if (Platform.OS === "android") {
        ToastAndroid.show("Terjadi kesalahan", ToastAndroid.SHORT);
      }
    } finally {
      setCustomerEmail("");
      setCustomerName("");
      setCustomerPhone("");
      setGender("");
      setAddress("");
      onClose();
    }
  };

  useEffect(() => {
    if (customerDialogPurpose === enumCustomerDialog.VOUCHER) {
      setCustomerEmail(customerEmailZustand || "");
      setCustomerName(customerNameZustand || "");
      setCustomerPhone(customerPhoneZustand || "");
      setGender(customerJenisKel || "");
      setAddress(customerAddress || "");
    } else {
      setCustomerEmail("");
      setCustomerName("");
      setCustomerPhone("");
      setGender("");
      setAddress("");
    }
  }, [customerDialogPurpose]);

  useEffect(() => {
    if (customerDialogPurpose === enumCustomerDialog.HIDE) {
      if (typeof callback === "function") {
        callback();
      }
    }
  }, [customerDialogPurpose, callback]);

  // Determine modal visibility safely
  const isModalVisible =
    typeof customerDialogPurpose === "string" &&
    customerDialogPurpose !== enumCustomerDialog?.HIDE;

  // Add validation to the close button handler
  const handleClose = () => {
    if (
      customerDialogPurpose === enumCustomerDialog.VOUCHER &&
      futureVoucher?.length > 0
    ) {
      if (Platform.OS === "android") {
        Alert.alert(
          "Konfirmasi",
          "Menutup form ini akan menghapus voucher yang akan diberikan. Lanjutkan?",
          [
            {
              text: "Batal",
              style: "cancel",
            },
            {
              text: "Ya, Hapus Voucher",
              onPress: () => {
                setFutureVoucher([]);
                onClose();
              },
            },
          ]
        );
      } else {
        setFutureVoucher([]);
        onClose();
      }
      return;
    }
    onClose();
  };

  return (
    <Modal
      visible={isModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      {/* Dark background overlay */}
      <View style={styles.modalOverlay}>
        {/* Modal content */}
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{"CUSTOMER"}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              {customerDialogPurpose === enumCustomerDialog.VOUCHER ? (
                <TouchableOpacity onPress={handleClose}>
                  <Text style={styles.rejectButtonText}>Tolak Voucher</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.closeButtonText}>Tutup</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-center text-lg font-bold text-wrap w-[90%] text-gray-600 mx-auto items-center justify-center">
            {title ? title : "Tambahkan Pelanggan Baru"}
          </Text>

          {/* Tab Buttons */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[
                styles.tabBarItem,
                currentTab === "create" && styles.activeTabItem,
              ]}
              onPress={() => setCurrentTab("create")}
            >
              <Text
                style={[
                  styles.tabText,
                  currentTab === "create" && styles.activeTabText,
                ]}
              >
                Tambahkan Pelanggan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabBarItem,
                currentTab === "pick" && styles.activeTabItem,
              ]}
              onPress={() => handlePressTabCustomerList()}
            >
              <Text
                style={[
                  styles.tabText,
                  currentTab === "pick" && styles.activeTabText,
                ]}
              >
                Pilih Pelanggan
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Input (when in pick mode) */}
          {currentTab === "pick" && (
            <View style={styles.searchContainer}>
              <TextInput
                placeholder="Cari Pelanggan..."
                style={styles.searchInput}
              />
            </View>
          )}

          {/* Tab Content */}
          {currentTab === "create" ? (
            // Form to add customer
            <ScrollView style={styles.scrollView}>
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>
                  Customer Email (Required):
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  keyboardType="email-address"
                  required
                />

                <Text style={styles.inputLabel}>Customer Name (Optional):</Text>
                <TextInput
                  style={styles.textInput}
                  value={customerName}
                  onChangeText={setCustomerName}
                />

                <Text style={styles.inputLabel}>
                  Customer Phone (Optional):
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  keyboardType="phone-pad"
                />

                <Text style={styles.inputLabel}>Jenis Kelamin (Optional):</Text>
                <View style={styles.genderButtons}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      gender === "laki-laki" && styles.genderButtonActive,
                    ]}
                    onPress={() => setGender("laki-laki")}
                  >
                    <Text style={styles.genderButtonText}>Laki-laki</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      gender === "perempuan" && styles.genderButtonActive,
                    ]}
                    onPress={() => setGender("perempuan")}
                  >
                    <Text style={styles.genderButtonText}>Perempuan</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Alamat: (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={address}
                  onChangeText={setAddress}
                  multiline={true}
                  numberOfLines={3}
                />

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onClose}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  {customerDialogPurpose === enumCustomerDialog.VOUCHER && (
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={handleClose}
                    >
                      <Text style={styles.rejectButtonText}>Tolak Voucher</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.submitButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          ) : (
            // Display customer list when "Pilih Pelanggan" tab is active
            <View style={styles.customerListContainer}>
              {customerOffline && customerOffline.length > 0 ? (
                <ScrollView style={styles.scrollView}>
                  {/* Header */}
                  <View style={styles.tableHeader}>
                    {[
                      "Name",
                      "Email",
                      "Phone",
                      "Action",
                    ].map((header) => (
                      <Text key={header} style={styles.headerText}>
                        {header}
                      </Text>
                    ))}
                  </View>

                  {/* Customer Data Rows */}
                  {customerOffline.map((customer, i) => (
                    <View
                      key={i}
                      style={[
                        styles.tableRow,
                        i % 2 === 0 ? styles.evenRow : styles.oddRow,
                      ]}
                    >
                      <Text style={styles.cellText}>
                        {customer?.name || ""}
                      </Text>
                      <Text style={styles.cellText}>
                        {customer?.email || ""}
                      </Text>
                      <Text style={styles.cellText}>
                        {customer?.phone || ""}
                      </Text>
                      <Text style={styles.cellText}>
                        {customer?.alamat || ""}
                      </Text>
                      <Text style={styles.cellText}>
                        {customer?.jenisKelamin || ""}
                      </Text>

                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handlePickCustomer(customer)}
                        >
                          <MousePointer2 size={20} color={"#2A4B8D"} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => {
                            Alert.alert(
                              "Confirm Delete",
                              "Konfirmasi Menghapus customer ini (akan terhapus di DB saat sync)?",
                              [
                                {
                                  text: "Cancel",
                                  style: "cancel",
                                },
                                {
                                  text: "OK",
                                  onPress: () => handleDeleteCustomer(customer),
                                },
                              ],
                              { cancelable: false }
                            );
                          }}
                        >
                          <Trash2 color={"red"} size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleEditCustomer(customer)}
                        >
                          <Pencil color={"#2A4B8D"} size={20} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyText}>Tidak ada pelanggan.</Text>
              )}

              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    width: "90%",
    maxWidth: 1000,
    height: "85%",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    backgroundColor: "#6D6D6D",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginBottom: 15,
  },
  tabBarItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F2F2F2",
  },
  activeTabItem: {
    backgroundColor: "#A7C7E7",
  },
  tabText: {
    color: "#6D6D6D",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#2A4B8D",
    fontWeight: "bold",
  },
  searchContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  inputLabel: {
    marginBottom: 5,
    fontSize: 14,
    color: "#333",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
  },
  genderButtons: {
    flexDirection: "row",
    marginBottom: 15,
  },
  genderButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    backgroundColor: "#f9f9f9",
  },
  genderButtonActive: {
    backgroundColor: "#A7C7E7",
    borderColor: "#2A4B8D",
  },
  genderButtonText: {
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#6D6D6D",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  cancelButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  rejectButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    height: 40,
  },
  rejectButtonText: {
    color: "white",
  },
  submitButton: {
    backgroundColor: "#1E3A8A",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    height: 40,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  customerListContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginBottom: 10,
  },
  headerText: {
    flex: 1,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginBottom: 5,
    alignItems: "center",
  },
  evenRow: {
    backgroundColor: "#F9F9F9",
  },
  oddRow: {
    backgroundColor: "#F0F0F0",
  },
  cellText: {
    flex: 1,
    textAlign: "center",
  },
  actionButtons: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  actionButton: {
    padding: 5,
  },
  emptyText: {
    textAlign: "center",
    color: "#6D6D6D",
    padding: 20,
    flex: 1,
  },
});

export default CustomerFormModal;
