package com.antigravity.pushupbird;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure WebView settings for Android 10+ through Android 16 (Honor MagicOS / HarmonyOS)
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebSettings settings = this.bridge.getWebView().getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setJavaScriptEnabled(true);
            settings.setAllowFileAccess(true);

            // Add JavaScript Interface so the web page can open system app settings directly if needed
            this.bridge.getWebView().addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void openAppSettings() {
                    try {
                        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        Uri uri = Uri.fromParts("package", getPackageName(), null);
                        intent.setData(uri);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception ignored) {}
                }
            }, "NativeAndroid");

            // WebChromeClient that ensures WebRTC camera streams are granted immediately if system permission is granted,
            // or prompts the user via Capacitor's permission launcher
            this.bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        boolean hasCamera = ContextCompat.checkSelfPermission(
                            MainActivity.this,
                            Manifest.permission.CAMERA
                        ) == PackageManager.PERMISSION_GRANTED;

                        if (hasCamera) {
                            try {
                                request.grant(request.getResources());
                            } catch (Exception e) {
                                super.onPermissionRequest(request);
                            }
                        } else {
                            super.onPermissionRequest(request);
                        }
                    });
                }
            });
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Check if camera permission was granted while in background or system settings
        if (this.bridge != null && this.bridge.getWebView() != null) {
            boolean hasCamera = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED;
            if (hasCamera) {
                runOnUiThread(() -> {
                    this.bridge.getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('cameraPermissionGranted'));",
                        null
                    );
                });
            }
        }
    }
}
