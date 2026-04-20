package com.next.marketplace;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        WebView.setWebContentsDebuggingEnabled(true);
      }
    } catch (Throwable ignored) {
      // ignore
    }

    try {
      WebView webView = getBridge() != null ? getBridge().getWebView() : null;
      if (webView != null) {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
      }
    } catch (Throwable ignored) {
      // ignore
    }
  }
}
