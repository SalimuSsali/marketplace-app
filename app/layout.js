import "./globals.css";
import { AppErrorBoundary } from "../components/AppErrorBoundary";
import { GlobalBottomTabBarMount } from "../components/GlobalBottomTabBarMount";
import { MainColumnPad } from "../components/MainColumnPad";
import { PwaInstallBanner } from "../components/PwaInstallBanner";
import { ServiceWorkerRegister } from "../components/ServiceWorkerRegister";

/** PWA: `public/manifest.json`, icons, and `public/sw.js`. */
export const metadata = {
  applicationName: "NEXT Marketplace",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NEXT Marketplace",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d9488",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-gray-100 text-neutral-900 antialiased">
        <AppErrorBoundary>
          <ServiceWorkerRegister />
          <PwaInstallBanner />
          <MainColumnPad>{children}</MainColumnPad>
          <GlobalBottomTabBarMount />
        </AppErrorBoundary>
      </body>
    </html>
  );
}
