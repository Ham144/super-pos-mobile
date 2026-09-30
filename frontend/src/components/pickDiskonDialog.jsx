import React from "react";

const PickDiskonDialog = ({
	diskonList,
	tempDiskonTerhubung,
	setTempDiskonTerhubung,
	handleKonfirmasiDiskonTerhubung,
	setTempDiskonTerputus,
	tempDiskonTerputus,
	selectedInventory,
}) => {
	return (
		<dialog id="pickdiskon" className="modal">
			<div className="relative w-[50xpx] bg-white p-4 rounded h-[400px]">
				<h3 className="font-bold text-lg">
					Pilih Diskon Yang berlaku untuk produk ini
				</h3>
				<div
					className="overflow-y-auto h-[300px] mb-4"
					style={{ maxHeight: "600px" }}
				>
					<table className="table min-h-32">
						<thead>
							<tr>
								<th>Judul Diskon</th>
								<th>Quantity</th>
								<th>Berlaku Hingga</th>
								<th>Rp Potongan Harga</th>
								<th>% Potongan Harga</th>
								<th>Barang Terhubung</th>
								<th>Pilihan</th>
							</tr>
						</thead>
						<tbody className="text-sm overflow-y-auto">
							{diskonList?.map((item) => {
								const isConnected =
									tempDiskonTerhubung?.includes(item._id) ||
									(item.skuTanpaSyarat?.includes(selectedInventory?.sku) &&
										!tempDiskonTerputus?.includes(item._id));
								return (
									<tr key={item._id}>
										<td>{item?.judulDiskon}</td>
										<td>{item?.quantityTersedia}</td>
										<td>
											{new Date(item?.berlakuHingga).toLocaleDateString(
												"id-ID"
											)}
										</td>
										<td>{item?.RpPotonganHarga?.$numberDecimal}</td>
										<td>{item?.percentPotonganHarga?.$numberDecimal}</td>
										<td>{item?.skuTanpaSyarat.length}</td>
										<td>
											<button
												className={`btn btn-sm ${
													isConnected ? "bg-green-300" : ""
												}`}
												onClick={() => {
													if (isConnected) {
														setTempDiskonTerhubung((prev) =>
															prev.filter((i) => i !== item._id)
														);
														setTempDiskonTerputus((prev) =>
															prev ? [...prev, item._id] : [item._id]
														);
													} else {
														setTempDiskonTerputus((prev) =>
															prev.filter((i) => i !== item._id)
														);
														setTempDiskonTerhubung((prev) =>
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
							setTempDiskonTerhubung([]);
							document.getElementById("pickdiskon").close();
						}}
					>
						Batal
					</button>
					<button
						className="btn btn-primary"
						onClick={() => {
							handleKonfirmasiDiskonTerhubung();
							document.getElementById("pickdiskon").close();
						}}
					>
						Konfirmasi
					</button>
				</div>
			</div>
		</dialog>
	);
};

export default PickDiskonDialog;
