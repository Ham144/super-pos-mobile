import mongoose from "mongoose";


const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Misalnya "kodeInvoice"
    seq: { type: Number, default: 0 },    // Nilai increment
});

const Counter = mongoose.model("Counter", counterSchema);
export default Counter