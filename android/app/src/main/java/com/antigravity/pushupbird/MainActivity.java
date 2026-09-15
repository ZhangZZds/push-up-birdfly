package com.antigravity.pushupbird;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Explicitly request native Android camera & audio runtime permissions on startup
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.MODIFY_AUDIO_SETTINGS
                },
                CAMERA_PERMISSION_REQUEST_CODE
            );
        }

        // 2. Configure WebView settings for Android 10+ through Android 16 (Honor MagicOS / HarmonyOS)
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebSettings settings = this.bridge.getWebView().getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setJavaScriptEnabled(true);
            settings.setAllowFileAccess(true);

            // Subclass BridgeWebChromeClient so Capacitor's core features (console, file picker, alerts)
            // remain intact while smoothly granting WebRTC camera stream.
            this.bridge.getWebView().setWebChromeClient(new CustomWebChromeClient(this.bridge, this));
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Check if camera permission was granted while in background or system settings
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {
            notifyCameraPermissionGranted();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                notifyCameraPermissionGranted();
            }
        }
    }

    private void notifyCameraPermissionGranted() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            runOnUiThread(() -> {
                this.bridge.getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('cameraPermissionGranted'));",
                    null
                );
            });
        }
    }

    private static class CustomWebChromeClient extends BridgeWebChromeClient {
        private final Activity activity;

        public CustomWebChromeClient(Bridge bridge, Activity activity) {
            super(bridge);
            this.activity = activity;
        }

        @Override
        public void onPermissionRequest(final PermissionRequest request) {
            boolean hasCamera = ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA)
                    == PackageManager.PERMISSION_GRANTED;

            if (hasCamera) {
                // If camera permission is already granted by Android OS, grant WebRTC directly on UI thread
                activity.runOnUiThread(() -> {
                    try {
                        request.grant(request.getResources());
                    } catch (Exception e) {
                        super.onPermissionRequest(request);
                    }
                });
            } else {
                // If not yet granted, invoke Capacitor's built-in permission launcher to trigger system prompt
                super.onPermissionRequest(request);
            }
        }
    }
}
