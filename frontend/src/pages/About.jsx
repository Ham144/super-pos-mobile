import { mockPages, mockBackend, PROD_URL } from "@/api/constant";

export default function About() {
  return (
    <>
        <title>Tentang CSI SUPER POS - Sistem POS by CSI untuk penjualan di outlet dan event besar</title>
        <meta
          name="description"
          content="CSI SUPER POS adalah Sistem POS by CSI untuk penjualan di outlet dan event besar internal PT Catur Sukses Internasional (CSI) yang terintegrasi dengan aplikasi mobile CSI SUPER POS."
        />
        <meta
          name="keywords"
          content="CSI SUPER POS, Point of Sale, POS System, Retail Management, Inventory Management"
        />
        <meta property="og:title" content="Tentang CSI SUPER POS" />
        <meta
          property="og:description"
          content="Sistem POS by CSI untuk penjualan di outlet dan event besar internal PT Catur Sukses Internasional (CSI)"
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content={`${PROD_URL}/about`}
        />
        <link rel="canonical" href={`${PROD_URL}/about`} />

      <main className="container mx-auto p-6">
        <div className="bg-base-100 p-8 rounded-2xl shadow-lg border border-base-300">
          <h1 className="text-4xl font-bold mb-8 text-center">
            Tentang CSI SUPER POS
          </h1>

          <div className="space-y-12">
            {/* Overview Section */}
            <section
              className="bg-base-200 p-6 rounded-xl"
              aria-labelledby="overview-heading"
            >
              <h2
                id="overview-heading"
                className="text-2xl font-semibold mb-4 flex items-center gap-2"
              >
                <span
                  className="w-2 h-8 bg-primary rounded-full"
                  aria-hidden="true"
                ></span>
                Overview
              </h2>
              <p className="text-base-content/80 text-lg">
                CSI SUPER POS adalah Sistem POS by CSI untuk penjualan di outlet dan event besar internal
                PT Catur Sukses Internasional (CSI) yang terintegrasi dengan
                aplikasi mobile CSI SUPER POS. Sistem ini dirancang untuk
                mengelola operasi bisnis kasir dengan fokus pada:
              </p>
              <ul className="list-disc list-inside space-y-3 mt-6 text-base-content/80">
                <li>
                  Manajemen penjualan dan laporan (Sales Report, Invoices,
                  Summary)
                </li>
                <li>
                  Pengelolaan inventori dan pembelian (Item Library, Purchase
                  Order)
                </li>
                <li>Manajemen promosi dan diskon (Promo, Diskon, Voucher)</li>
                <li>
                  Pengelolaan pengguna dan outlet (Kasir, SPG, Outlet
                  Management)
                </li>
                <li>Integrasi dengan aplikasi mobile untuk operasi kasir</li>
                <li>Offline oriented</li>
              </ul>
            </section>

            {/* Technology Stack Section */}
            <section
              className="bg-base-200 p-6 rounded-xl"
              aria-labelledby="tech-stack-heading"
            >
              <h2
                id="tech-stack-heading"
                className="text-2xl font-semibold mb-6 flex items-center gap-2"
              >
                <span
                  className="w-2 h-8 bg-primary rounded-full"
                  aria-hidden="true"
                ></span>
                Technology Stack
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                  <div className="card-body">
                    <h3 className="card-title text-lg font-semibold mb-4">
                      Frontend Web
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                      <li>React 18 dengan Vite</li>
                      <li>Tailwind CSS & DaisyUI untuk UI</li>
                      <li>TanStack Query untuk state management</li>
                      <li>Zustand untuk global state</li>
                      <li>React Router untuk navigasi</li>
                      <li>Chart.js untuk visualisasi data</li>
                      <li>Axios untuk HTTP requests</li>
                      <li>React Hot Toast untuk notifikasi</li>
                      <li>Lucide React untuk ikon</li>
                      <li>ESLint untuk linting</li>
                    </ul>
                  </div>
                </div>
                <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                  <div className="card-body">
                    <h3 className="card-title text-lg font-semibold mb-4">
                      Mobile App
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                      <li>React Native dengan Expo</li>
                      <li>NativeWind (Tailwind) untuk UI</li>
                      <li>TanStack Query untuk state management</li>
                      <li>Zustand untuk global state</li>
                      <li>Expo Router untuk navigasi</li>
                      <li>AsyncStorage untuk offline storage</li>
                      <li>NetInfo untuk network monitoring</li>
                      <li>Sentry untuk error tracking</li>
                      <li>React Native Gesture Handler untuk interaksi</li>
                      <li>React Native Reanimated untuk animasi</li>
                      <li>React Native Vector Icons untuk ikon</li>
                      <li>React Native TCP Socket Printer thermal</li>
                      <li>React Native Keychain untuk keamanan</li>
                      <li>React Native Permissions untuk izin</li>
                      <li>TypeScript untuk type safety</li>
                    </ul>
                  </div>
                </div>
                <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                  <div className="card-body">
                    <h3 className="card-title text-lg font-semibold mb-4">
                      Backend
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                      <li>Node.js dengan Express</li>
                      <li>MongoDB dengan Mongoose</li>
                      <li>JWT untuk autentikasi</li>
                      <li>Nodemailer untuk email</li>
                      <li>Node-thermal-printer untuk printing</li>
                      <li>Moment-timezone untuk manajemen waktu</li>
                      <li>Axios untuk HTTP requests</li>
                      <li>Bcryptjs untuk enkripsi</li>
                      <li>Cookie Parser untuk manajemen cookie</li>
                      <li>CORS untuk keamanan</li>
                      <li>CSV Parser untuk parsing file</li>
                      <li>Express File Upload untuk upload file</li>
                      <li>Multer untuk handling multipart/form-data</li>
                      <li>Node Cron untuk scheduling</li>
                      <li>Sharp untuk image processing</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Features Section */}
            <section
              className="bg-base-200 p-6 rounded-xl"
              aria-labelledby="features-heading"
            >
              <h2
                id="features-heading"
                className="text-2xl font-semibold mb-6 flex items-center gap-2"
              >
                <span
                  className="w-2 h-8 bg-primary rounded-full"
                  aria-hidden="true"
                ></span>
                Fitur Utama
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockPages.map((page) => (
                  <div
                    key={page.originalPath}
                    className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="card-body">
                      <h3 className="card-title text-lg font-semibold">
                        {page.originalPath}
                      </h3>
                      <p className="text-base-content/80">{page.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* API Documentation Section */}
            <section
              className="bg-base-200 p-6 rounded-xl"
              aria-labelledby="api-docs-heading"
            >
              <h2
                id="api-docs-heading"
                className="text-2xl font-semibold mb-6 flex items-center gap-2"
              >
                <span
                  className="w-2 h-8 bg-primary rounded-full"
                  aria-hidden="true"
                ></span>
                API Documentation (Tidak semua API terdokumentasi)
              </h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th scope="col">Endpoint</th>
                      <th scope="col">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockBackend.map((api) => (
                      <tr key={api.originalPath}>
                        <td className="font-mono">{api.originalPath}</td>
                        <td>{api.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Contact Section */}
            <section
              className="bg-base-200 p-6 rounded-xl"
              aria-labelledby="contact-heading"
            >
              <h2
                id="contact-heading"
                className="text-2xl font-semibold mb-6 flex items-center gap-2"
              >
                <span
                  className="w-2 h-8 bg-primary rounded-full"
                  aria-hidden="true"
                ></span>
                Kontak & Dukungan
              </h2>
              <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                <div className="card-body">
                  <p className="text-base-content/80 text-lg">
                    Pertanyaan Teknis, saran, kritik:
                  </p>
                  <ul className="list-disc list-inside space-y-2 mt-4 text-base-content/80">
                    <li>
                      Email:{" "}
                      <a
                        href="mailto:yafizham@catur.co.id"
                        className="text-primary hover:underline"
                      >
                        yafizham@catur.co.id
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
