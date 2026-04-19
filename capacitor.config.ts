import type { CapacitorConfig } from "@capacitor/cli";
import { config as loadEnv } from "dotenv";
import path from "node:path";

loadEnv({ path: path.resolve(__dirname, ".env.local") });
loadEnv({ path: path.resolve(__dirname, ".env") });

/**
 * Android shell loads your Next.js deployment (or dev server) in a WebView.
 * Set in `.env.local`: CAPACITOR_SERVER_URL=https://your-app.vercel.app
 * Emulator + local Next (port 3010): http://10.0.2.2:3010
 */
const url = (process.env.CAPACITOR_SERVER_URL ?? "").trim();

const config: CapacitorConfig = {
  appId: "com.next.marketplace",
  appName: "Next",
  webDir: "www",
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#000000",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
    },
  },
};

if (url) {
  config.server = {
    url,
    cleartext: url.startsWith("http://"),
    androidScheme: url.startsWith("https") ? "https" : "http",
  };
}

export default config;
