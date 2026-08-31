import mongoose from "mongoose";

export const NAV_SOAP_OPERATIONS = [
  "GetStatelessInventory",
  "GetInventoryByLocationMultiple",
  "SalesOrderAutoPostingShip",
  "GetSalesShipmentLines",
  "WsUndoShipment",
  "WsPostInvoiceSO",
];

const operationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      enum: NAV_SOAP_OPERATIONS,
    },
    soapAction: {
      type: String,
      default: "",
    },
    bodyTemplate: {
      type: String,
      default: "",
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const soapSchema = new mongoose.Schema(
  {
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outlet",
      required: true,
      unique: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    usernameNTLM: {
      type: String,
      required: true,
    },
    passwordNTLM: {
      type: String,
      required: true,
    },
    timeoutMs: {
      type: Number,
      default: 30000,
    },
    operations: {
      type: [operationSchema],
      default: [],
    },
    noSeries: {
      type: String,
      default: "",
    }
  },
  {
    timestamps: true,
  },
);

const Soap = mongoose.model("Soap", soapSchema);
export default Soap;
