import DaftarVoucher from "../models/DaftarVoucher.model.js"


const checkVoucher = async (req, res, next) => {
    const { chiperText, items } = req.body
    if (!chiperText) {
        return next()
    }
    else {
        const voucherDB = await DaftarVoucher.findOne({
            kodeVoucherEncrypted: { $regex: chiperText, $options: 'i' }
        })
        if (!voucherDB) {
            return res.status(400).json({ message: "voucher yang digunakan tidak terdaftar" })
        }
        const promiseEachItem = await Promise.allSettled(items.map(async (item) => {
            try {
                //jika ada di db
                // Validasi logika untuk setiap item
                //cek apakah sku termasuk diblokir atau tidak
                if (voucherDB.blokirSKU.includes(item.sku)) {
                    throw new Error(`SKU ${item.sku} tidak berlaku untuk voucher ini.`);
                }
                //cek quantity tersedia apakah masih ada
                //cek waktu dari dan hingga valid
                //decrypt voucher dan compare dengan kodeVoucherOriginal
            } catch (error) {
                return { item, status: 'failed', error: error.message };
            }

        }))
        //ubah Voucher model
        //ubah kwitansiDanHistory model
        //kurangi quantityTersedia voucher -1
    }
}

export default checkVoucher