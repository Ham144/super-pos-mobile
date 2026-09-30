import DaftartDiskon from "../models/DaftarDiskon.model.js"

const checkDiskon = async (req, res, next) => {
    const { items } = req.body
    await Promise.allSettled(items.map(async (item) => {

        //cari diskon yang kena
        const MultidiskonDB = await DaftartDiskon.find({
            skuTanpaSyarat: { $in: [item?.sku] }
        })
        let diskonDB;

        if (MultidiskonDB?.length > 1) {
            let palingUntung = 0 //terpotong berapa RP
            let palingUntungVoucher;

            for (const diskon of MultidiskonDB) {
                if (diskon?.percentPotonganHarga !== undefined && parseFloat(diskon?.percentPotonganHarga) != 0) {
                    //rupiah kan dulu 
                    const rupiah = parseFloat(item.totalRp) * parseFloat(diskon.percentPotonganHarga);
                    console.log("diskon : ", rupiah);
                    if (rupiah > palingUntung) {
                        palingUntung = rupiah;
                        palingUntungVoucher = diskon;
                    }
                } else if (diskon?.RpPotonganHarga) {
                    if (diskon?.RpPotonganHarga > palingUntung) {
                        console.log("diskon : ", diskon.RpPotonganHarga); //
                        palingUntung = parseFloat(diskon.RpPotonganHarga);
                        palingUntungVoucher = diskon;
                    }
                }
            }

            console.log("palingUntungVoucher: ", palingUntungVoucher);
            diskonDB = palingUntungVoucher
        }

        else if (MultidiskonDB.length == 1) {
            console.log("multidiskon hanya ada satu")
            diskonDB = MultidiskonDB[0] //kalau hanya satu pilih langsung

            if (!diskonDB) {
                console.log("diskon db tidak ada")
                return
            } else {
                //cek apakah masih berlaku waktunya
                if (diskonDB?.berlakuDari && diskonDB.berlakuDari > new Date()) {
                    req.diskon = [
                        ...(req.diskon || []),
                        {
                            item: item,
                            pesan: `diskon ${diskonDB?.judulDiskon} belum berlaku waktunya`,
                            isDiskon: false
                        }
                    ]
                    return
                }
                if (diskonDB?.berlakuHingga && diskonDB.berlakuHingga < new Date()) {
                    req.diskon = [
                        ...(req.diskon || []),
                        {
                            item: item,
                            pesan: `diskon ${diskonDB?.judulDiskon} sudah tidak berlaku`,
                            isDiskon: false
                        }
                    ]
                    return
                }


                //cek quantityTersedia apakah masih ada
                if (diskonDB?.quantityTersedia == 0 || diskonDB?.quantityTersedia == undefined) {
                    console.log("disini masih ada", diskonDB) //disini masih ada

                    return req.diskon = [
                        ...(req.diskon || []),
                        {
                            item: item,
                            pesan: `diskon ${diskonDB.judulDiskon} tersedia tidak ada lagi`,
                            isDiskon: false
                        }
                    ]
                }

                //cek apakah memenuhi syarat
                const potonganHargaPercent = parseFloat(diskonDB?.percentPotonganHarga)
                const RpPotonganHarga = diskonDB?.RpPotonganHarga

                if (potonganHargaPercent) {
                    const hargaAkhir = item.totalRp - (item.totalRp * potonganHargaPercent)
                    return req.diskon = [
                        ...(req.diskon || []),
                        {
                            item: item,
                            pesan: `mendapatkan diskon ${diskonDB?.judulDiskon}, harga awal ${item.totalRp}  menjadi ${hargaAkhir} atas potongan ${potonganHargaPercent * 100}%`,
                            isDiskon: true,
                            before: parseFloat(item.totalRp),
                            after: parseFloat(hargaAkhir),
                            diskonId: diskonDB?._id
                        }
                    ]
                } else {
                    const hargaAkhir = item.totalRp - RpPotonganHarga

                    return req.diskon = [
                        ...(req.diskon || []),
                        {
                            item: item,
                            pesan: `mendapatkan diskon ${diskonDB?.judulDiskon}, harga awal ${item.totalRp}  menjadi ${parseFloat(hargaAkhir)} atas potongan ${parseFloat(RpPotonganHarga)}`,
                            isDiskon: true,
                            before: parseFloat(item.totalRp),
                            after: parseFloat(hargaAkhir),
                            diskonId: diskonDB?._id
                        }
                    ]
                }
            }
        }
    }))
    next()
}

export default checkDiskon