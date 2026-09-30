import { useState, useRef, useMemo, useEffect } from "react";
import { useCurrentBill } from "../store";

export const useBillCalculations = () => {
  const [cebelumDiskon, setCebelumDiskon] = useState(0);
  const [setelahDiskon, setSetelahDiskon] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const calculationTimeout = useRef(null);
  const previousValues = useRef({ sebelumDiskon: 0, setelahDiskon: 0 });

  const currentBill = useCurrentBill((state) => state.currentBill);
  const diskon = useCurrentBill((state) => state.diskon);
  const total = useCurrentBill((state) => state.total);
  const setTotal = useCurrentBill((state) => state.setTotal);
  const subTotal = useCurrentBill((state) => state.subTotal);
  const setSubTotal = useCurrentBill((state) => state.setSubTotal);
  const implementedVoucher = useCurrentBill(
    (state) => state.implementedVoucher
  );

  // Optimize the memoization by extracting only needed parts from currentBill
  const billForCalculation = useMemo(() => {
    if (!currentBill?.length) return [];
    return currentBill.map((item) => ({
      sku: item.sku,
      RpHargaDasar: item.RpHargaDasar,
      quantity: item.quantity,
    }));
  }, [currentBill]);

  const computedTotalValues = useMemo(() => {
    if (!billForCalculation?.length) {
      return { sebelumDiskon: 0, setelahDiskon: 0 };
    }

    let sebelumDiskon = 0;
    let setelahDiskon = 0;
    let implementedVoucherTotalCut = 0;

    if (implementedVoucher?.length > 0) {
      implementedVoucherTotalCut = implementedVoucher.reduce(
        (total, voucher) => {
          return total + Number(voucher.potongan) || 0;
        },
        0
      );
    }

    billForCalculation.forEach((item) => {
      const hargaDasar = parseFloat(item.RpHargaDasar) || 0;
      const quantity = parseInt(item.quantity) || 0;
      const normalTotal = hargaDasar * quantity;

      sebelumDiskon += normalTotal;

      const diskonItem = diskon.find((d) => d.sku === item.sku);
      if (diskonItem) {
        const { RpPotonganHarga, percentPotonganHarga } =
          diskonItem.diskonInfo || {};
        if (!isNaN(RpPotonganHarga)) {
          setelahDiskon += Math.max(0, normalTotal - RpPotonganHarga);
        } else if (!isNaN(percentPotonganHarga)) {
          setelahDiskon += Math.max(
            0,
            normalTotal * (1 - percentPotonganHarga)
          );
        } else {
          setelahDiskon += normalTotal;
        }
      } else {
        setelahDiskon += normalTotal;
      }
    });

    setelahDiskon -= implementedVoucherTotalCut;

    return { sebelumDiskon, setelahDiskon: Math.max(0, setelahDiskon) };
  }, [billForCalculation, diskon, implementedVoucher]);

  useEffect(() => {
    if (calculationTimeout.current) {
      clearTimeout(calculationTimeout.current);
    }

    // Only set calculating state if there are actual changes
    const { sebelumDiskon: newSebelum, setelahDiskon: newSetelah } =
      computedTotalValues;
    const hasChanges =
      newSebelum !== previousValues.current.sebelumDiskon ||
      newSetelah !== previousValues.current.setelahDiskon;

    if (hasChanges) {
      setIsCalculating(true);
    } else if (!isCalculating) {
      // If there are no changes and we're not in calculating state, do nothing
      return;
    }

    calculationTimeout.current = setTimeout(() => {
      const { sebelumDiskon: newSebelum, setelahDiskon: newSetelah } =
        computedTotalValues;
      previousValues.current = {
        sebelumDiskon: newSebelum,
        setelahDiskon: newSetelah,
      };

      // Only update state if values have changed
      if (newSebelum !== cebelumDiskon) {
        setCebelumDiskon(newSebelum);
      }
      if (newSetelah !== setelahDiskon) {
        setSetelahDiskon(newSetelah);
      }

      // Batch these updates to reduce re-renders
      if (newSetelah !== total || newSetelah !== subTotal) {
        setTotal(newSetelah);
        setSubTotal(newSetelah);
      }

      setIsCalculating(false);
    }, 50); // Reduce timeout slightly for better responsiveness

    return () => {
      if (calculationTimeout.current) {
        clearTimeout(calculationTimeout.current);
      }
    };
  }, [
    computedTotalValues,
    isCalculating,
    cebelumDiskon,
    setelahDiskon,
    total,
    subTotal,
    setTotal,
    setSubTotal,
  ]);

  return {
    cebelumDiskon,
    setelahDiskon,
    isCalculating,
    total,
    subTotal,
  };
};
