import React from "react";

const PickPromoDialog = ({
	promoList,
	tempPromoTerhubung,
	setTempPromoTerhubung,
	handleKonfirmasiPromoTerhubung,
	setTempPromoTerputus,
	selectedInventory,
	tempPromoTerputus,
}) => {
	return (
		<dialog id="pickpromo" className="modal">
			<div className="relative w-[50xpx] bg-white p-4 rounded h-[400px]">
				<h3 className="font-bold text-lg">
					Pilih Promo Yang berlaku untuk produk ini
				</h3>
				<div
					className="overflow-y-auto h-[300px] mb-4"
					style={{ maxHeight: "600px" }}
				>
					<table className="table min-h-32">
						<thead>
							<tr>
								<th>Judul Promo</th>
								<th>Quantity</th>
								<th>Berlaku Hingga</th>
								<th>Syarat Quantity</th>
								<th>Syarat Total Rp</th>
								<th>Barang Terhubung</th>
								<th>Quantity Bonus</th>
								<th>Pilihan</th>
							</tr>
						</thead>
						<tbody className="text-sm overflow-y-auto">
							{promoList?.map((item) => {
								const isConnected =
									tempPromoTerhubung?.includes(item._id) ||
									(item.skuList?.includes(selectedInventory?.sku) &&
										!tempPromoTerputus?.includes(item._id));
								return (
									<tr key={item._id}>
										<td>{item.judulPromo}</td>
										<td>{item?.quantityBerlaku}</td>
										<td>
											{new Date(item?.berlakuHingga).toLocaleDateString(
												"id-ID"
											)}
										</td>
										<td>{item?.syaratQuantity}</td>
										<td>{item?.syaratTotalRp}</td>
										<td>{item?.skuList?.length}</td>
										<td>{item?.quantityBonus}</td>
										<td>
											<button
												className={`btn btn-sm ${
													isConnected ? "bg-green-300" : ""
												}`}
												onClick={() => {
													if (isConnected) {
														setTempPromoTerhubung((prev) =>
															prev ? prev.filter((i) => i !== item._id) : []
														);
														setTempPromoTerputus((prev) =>
															prev ? [...prev, item._id] : [item._id]
														);
													} else {
														setTempPromoTerputus((prev) =>
															prev ? prev.filter((i) => i !== item._id) : []
														);
														setTempPromoTerhubung((prev) =>
															prev ? [...prev, item._id] : [item._id]
														);
													}
												}}
											>
												{isConnected ? "Terhubung" : "Hubungkan"}
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<div className="bottom-0 left-0 right-0 absolute flex justify-between px-4 py-2 bg-white">
					<button
						className="btn"
						onClick={() => {
							setTempPromoTerhubung([]);
							document.getElementById("pickpromo").close();
						}}
					>
						Batal
					</button>
					<button
						className="btn btn-primary"
						onClick={() => {
							handleKonfirmasiPromoTerhubung();
							document.getElementById("pickpromo").close();
						}}
					>
						Konfirmasi
					</button>
				</div>
			</div>
		</dialog>
	);
};

export default PickPromoDialog;
