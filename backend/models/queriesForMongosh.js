//ini ga ada hubunngannya cuma note
//update mongosh masal
const updates = [
  { sku: "HR2115/00", qty: 1 },
  { sku: "NA211/00", qty: 4 },
  { sku: "HR2115/40", qty: 1 },
  { sku: "HR2939/55", qty: 2 },
  { sku: "DST0510/20", qty: 2 },
  { sku: "HD1172/99", qty: 7 },
];

const bulk = updates.map((item) => ({
  updateOne: {
    filter: { sku: item.sku },
    update: {
      $inc: {
        quantity: -item.qty,
        terjual: item.qty,
      },
    },
  },
}));

db.inventoryrefrensis.bulkWrite(bulk);

//pindahin value dari diri sendiri tapi beda key
db.inventoryrefrensis.find().limit(10);
db.inventoryrefrensis.find().forEach((doc) => {
  if (doc._id !== doc.sku) {
    const updatedDoc = { ...doc, _id: doc.sku };
    delete updatedDoc._id;

    // Hapus dokumen lama
    db.InventoryRefrensis.deleteOne({ _id: doc._id });

    // Masukkan ulang dengan _id yang sama seperti sku
    db.InventoryRefrensis.insertOne(updatedDoc);
  }
});
