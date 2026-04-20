import "./globals.css";
import { AppErrorBoundary } from "../components/AppErrorBoundary";
import { GlobalHeaderMount } from "../components/GlobalHeaderMount";
import { GlobalBottomTabBarMount } from "../components/GlobalBottomTabBarMount";
import { MainColumnPad } from "../components/MainColumnPad";
import { PwaInstallBanner } from "../components/PwaInstallBanner";
import InitNotifications from "../components/InitNotifications";
import { ServiceWorkerRegister } from "../components/ServiceWorkerRegister";

/** PWA: `public/manifest.json`, icons, and `public/sw.js`. */
export const metadata = {
  title: "Next",
  applicationName: "Next",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon.png", type: "image/png", sizes: "64x64" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Next",
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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-gray-100 text-neutral-900 antialiased">
        <AppErrorBoundary>
          <ServiceWorkerRegister />
          <InitNotifications />
          <PwaInstallBanner />
          <GlobalHeaderMount />
          <MainColumnPad>{children}</MainColumnPad>
          <GlobalBottomTabBarMount />
        </AppErrorBoundary>
      </body>
    </html>
  );
}
