import mongoose from "mongoose"
import DaftarPromo from "../models/DaftarPromo.model.js"
import InventoryRefrensi from "../models/InventoryRefrensi.model.js"

const checkPromo = async (req, res, next) => {
    const { items } = req.body
    try {
        await Promise.allSettled(items.map(async (item) => {
            const promoDB = await DaftarPromo.findOne({
                skuList: { $in: [item?.sku] }
            })
            if (!promoDB) {
                return
            } else {
                //cek apakah masih berlaku waktunya
                if (promoDB?.berlakuDari && promoDB.berlakuDari > new Date()) {
                    req.promo = [
                        ...(req.promo || []),
                        {
                            item: item,
                            pesan: `promo ${promoDB?.judulPromo} belum berlaku waktunya`,
                            isPromo: false
                        }
                    ]
                    return
                }
                if (promoDB?.berlakuHingga && promoDB.berlakuHingga < new Date()) {
                    req.promo = [
                        ...(req.promo || []),
                        {
                            item: item,
                            pesan: `promo ${promoDB?.judulPromo} sudah tidak berlaku`,
                            isPromo: false
                        }
                    ]
                    return
                }

                //cek quantityTersedia apakah masih ada
                if (promoDB?.quantityBerlaku == 0 || promoDB?.quantityBerlaku == undefined) {
                    return req.promo = [
                        ...(req.promo || []),
                        {
                            item: item,
                            pesan: `promo ${promoDB?.judulPromo} quantity tersedia tidak ada lagi`,
                            isPromo: false
                        }
                    ]
                }

                //cek apakah memenuhi syarat (syarat quantity, syarat total)
                let memenuhiSyaratQuantity = false
                let memenuhiSyaratTotal = false
                if (promoDB?.syaratQuantity) {
                    memenuhiSyaratQuantity = await item.quantity >= promoDB.syaratQuantity
                }
                if (promoDB?.syaratTotalRp != undefined) {
                    memenuhiSyaratTotal = await item.totalRp >= promoDB.syaratTotalRp
                }
                console.log(memenuhiSyaratTotal)


                if (!memenuhiSyaratQuantity && !memenuhiSyaratTotal) {
                    return req.promo = [
                        ...(req.promo || []),
                        {
                            item: item,
                            pesan: `syarat promo ${promoDB?.judulPromo} tidak terpenuhi: minimal ${promoDB?.syaratQuantity} quantity atau minimal ${promoDB?.syaratTotalRp} total`,
                            isPromo: false
                        }
                    ]
                }

                if (memenuhiSyaratQuantity || memenuhiSyaratTotal) {
                    const free = promoDB.skuBarangBonus
                    //coba cari apakah masih ada bonus, kalau ga ada ganti bonus
                    let freeDB = await InventoryRefrensi.findOne({
                        $and: [
                            { sku: free },
                            { quantity: { $gt: item.quantity } },
                        ]
                    })
                    if (!freeDB) {
                        console.log("Mencoba mengganti bonus karena tidak tersedia")
                        freeDB = await InventoryRefrensi.findOne({
                            $and: [
                                { isDisabled: true },
                                { quantity: { $gt: 3 } },
                                { RpHargaDasar: { $lt: new mongoose.Types.Decimal128('20000') } }
                            ]
                        })
                    }

                    if (!freeDB) {
                        return req.promo = [
                            ...(req.promo || []),
                            {
                                item: item,
                                pesan: `mendapatkan promo atas pembelian yang memenuhi syarat minimal ${promoDB?.syaratQuantity} quantity atau minimal ${promoDB?.syaratTotalRp} total  dengan barang yang terhubug ke promo ${promoDB?.judulPromo}`,
                                isPromo: true,
                                free: "Promo boleh ditentukan Sales jika sistem gagal mencari bonus yang cocok"
                            }
                        ]
                    }

                    return req.promo = [
                        ...(req.promo || []),
                        {
                            item: item,
                            pesan: `mendapatkan promo atas pembelian yang memenuhi syarat minimal ${promoDB?.syaratQuantity} quantity atau minimal ${promoDB?.syaratTotalRp} total  dengan barang yang terhubug ke promo ${promoDB?.judulPromo}`,
                            isPromo: true,
                            free: freeDB,
                            bonusQuantity: promoDB?.quantityBonus || 1
                        }
                    ]
                }
            }
        }))
        next()
    } catch (error) {
        console.log("terjadi error; ", error)
        next()
    }
}

export default checkPromo
