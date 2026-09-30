import mongoose from "mongoose"


const itemLibraryThumbnailSchema = new mongoose.Schema({
    buffer: Buffer,
    externalLinkAlternatif: String,
    sku: String,
    originalName: String,
    mimetype: String,
})

const ImteLibraryThumbnail = mongoose.model('itemLibraryThumbnail', itemLibraryThumbnailSchema)
export default ImteLibraryThumbnail