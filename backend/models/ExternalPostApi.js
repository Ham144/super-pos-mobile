import mongoose from "mongoose";

//sumber external untuk dapat inventories agar tidak buat service dan fitur lagi, gunakan yang sudah ada
const ExternalInventorySourceSchema = mongoose.Schema({
  method: {
    enum: ["POST", "GET", ""],
    default: "GET",
  },
  url: {
    type: String,
    required: true,
  },
  x_api_key: {
    type: String,
  },
});

const ExternalSourceModel = new mongoose.model(
  "externalInventory",
  ExternalInventorySourceSchema,
);
export default ExternalSourceModel;
