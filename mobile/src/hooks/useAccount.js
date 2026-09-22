import { router } from "expo-router";
import { useCurrentBill } from "../store";
import { forceLogoutSession } from "../api/sessionAuth";

const useAccount = () => {
  const { clearSale } = useCurrentBill();

  const logoutNoSync = async () => {
    try {
      clearSale();
      await forceLogoutSession(undefined, { silent: true });
    } catch (error) {
      console.error("Gagal logout:", error);
      router.replace("/");
    }
  };

  return { logoutNoSync };
};

export default useAccount;
