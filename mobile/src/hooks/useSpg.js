import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { getAllSpg } from "../api";

const useSpg = () => {
  const {
    data: spgList = [],
    refetch,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["spgList"],
    queryFn: async () => {
      const spgListFromStorage = await AsyncStorage.getItem("spg");
      if (spgListFromStorage) {
        return JSON.parse(spgListFromStorage);
      }

      const response = await getAllSpg();
      const list = Array.isArray(response?.data) ? response.data : [];
      await AsyncStorage.setItem("spg", JSON.stringify(list));
      return list;
    },
  });
  
  const refetchSpgList = async () => {
    await AsyncStorage.removeItem("spg");
    return refetch();
  };

  return {
    spgList: Array.isArray(spgList) ? spgList : [],
    refetchSpgList,
    isLoading,
    isFetching,
    isError,
    error,
  };
};

export default useSpg;
