import crypto from 'crypto'
import "dotenv/config"


const encryptKeyEnv = process.env.ENCRYPTION_KEY
const ENCRYPTION_KEY = crypto.createHash('sha256').update(encryptKeyEnv).digest(); // Membuat key sepanjang 32 byte
const IV_LENGTH = 16; // Panjang IV untuk AES


export const generateOriginalVoucher = () => {
    return crypto.randomBytes(16).toString('hex');
}

// Fungsi untuk mengenkripsi kode voucher
export const encryptVoucherCode = (voucherCode) => {
    let iv = crypto.randomBytes(IV_LENGTH); // Membuat IV yang acak
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv); // AES-256 dengan CBC mode
    let encrypted = cipher.update(voucherCode, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Menyimpan IV bersama dengan data terenkripsi (biasanya IV disimpan bersama karena diperlukan untuk dekripsi)
    return iv.toString('hex') + ':' + encrypted;
};

// Fungsi untuk mendekripsi kode voucher
export const decryptVoucherCode = (encryptedVoucherCode) => {
    let parts = encryptedVoucherCode.split(':');
    let iv = Buffer.from(parts[0], 'hex');
    let encryptedText = parts[1];

    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

