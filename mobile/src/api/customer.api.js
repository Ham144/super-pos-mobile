import axios from "axios";
import { getBaseUrl, getMobileAuthHeaders } from "../constant";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ToastAndroid } from "react-native";

export const getAllCustomer = async () => {
    const response = await axios.get(
      `${await getBaseUrl()}/api/v1/customer/getAllCustomer`,
      {
        headers: await getMobileAuthHeaders(),
      },
    );
    if (!response?.data) {
        ToastAndroid?.show(
          "Data customer kosong",
          ToastAndroid.SHORT,
        );
      }
    return response.data;
  };
  
  export const getCustomerList = async () => {
    const customer = JSON.parse(await AsyncStorage.getItem("customer"));
    return customer;
  };
  
  export const deleteCustomer = async (custToDel, customerList) => {
    const newOrder = customerList.filter((cust) => {
      return cust.name !== custToDel.name;
    });
  
    await AsyncStorage.setItem("customer", JSON.stringify(newOrder));
    return true;
  };

  