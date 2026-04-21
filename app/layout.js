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
  const firebasePublic = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
  };
  const firebaseInline = `try{globalThis.__NEXT_PUBLIC_FIREBASE__=${JSON.stringify(firebasePublic)};}catch(e){}`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: firebaseInline }} />
      </head>
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
