package com.maizecrush.zimbabweharvest;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebChromeClient;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;
    private static final int CREATE_BACKUP_REQUEST_CODE = 1002;
    private static final int MAX_BACKUP_BYTES = 1024 * 1024;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private String pendingBackupJson;
    private Object backCallback;
    private boolean handlingBack;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(11, 33, 24));
        getWindow().setNavigationBarColor(Color.rgb(11, 33, 24));
        getWindow().getDecorView().setSystemUiVisibility(0);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(11, 33, 24));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadsImagesAutomatically(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"https".equalsIgnoreCase(uri.getScheme())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (ActivityNotFoundException ignored) {
                    // Keep the game usable even if the device has no browser available.
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> callback,
                FileChooserParams params
            ) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                    return true;
                } catch (ActivityNotFoundException | SecurityException error) {
                    filePathCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
        });
        webView.addJavascriptInterface(new BackupBridge(), "MaizeCrushNative");

        // Android 15+ enforces edge-to-edge for modern target SDKs. Apply system-bar
        // and display-cutout insets to the WebView so controls remain reachable.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            webView.setOnApplyWindowInsetsListener((view, windowInsets) -> {
                Insets safeInsets = windowInsets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout()
                );
                view.setPadding(safeInsets.left, safeInsets.top, safeInsets.right, safeInsets.bottom);
                return windowInsets;
            });
        }

        setContentView(webView);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            webView.requestApplyInsets();
        }

        // Android 13+ predictive back no longer dispatches onBackPressed by default.
        // Register the supported callback while retaining the legacy fallback.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            android.window.OnBackInvokedCallback callback = this::handleBackNavigation;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                callback
            );
            backCallback = callback;
        }

        if (savedInstanceState == null) {
            webView.loadUrl("file:///android_asset/index.html");
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private final class BackupBridge {
        @JavascriptInterface
        public void saveBackup(String json) {
            if (json == null || json.getBytes(StandardCharsets.UTF_8).length > MAX_BACKUP_BYTES) {
                runOnUiThread(() -> notifyBackupExportResult(false));
                return;
            }
            runOnUiThread(() -> {
                pendingBackupJson = json;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, "maize-crush-backup.json");
                try {
                    startActivityForResult(intent, CREATE_BACKUP_REQUEST_CODE);
                } catch (ActivityNotFoundException | SecurityException error) {
                    pendingBackupJson = null;
                    notifyBackupExportResult(false);
                }
            });
        }
    }

    private void notifyBackupExportResult(boolean success) {
        if (webView == null || isFinishing() || isDestroyed()) return;
        webView.evaluateJavascript(
            "if(typeof window.maizeCrushBackupExportResult==='function'){window.maizeCrushBackupExportResult(" + success + ");}",
            null
        );
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            ValueCallback<Uri[]> callback = filePathCallback;
            filePathCallback = null;
            if (callback != null) {
                callback.onReceiveValue(
                    resultCode == RESULT_OK ? WebChromeClient.FileChooserParams.parseResult(resultCode, data) : null
                );
            }
            return;
        }
        if (requestCode == CREATE_BACKUP_REQUEST_CODE) {
            String json = pendingBackupJson;
            pendingBackupJson = null;
            boolean saved = false;
            if (resultCode == RESULT_OK && data != null && data.getData() != null && json != null) {
                try (OutputStream output = getContentResolver().openOutputStream(data.getData())) {
                    if (output != null) {
                        output.write(json.getBytes(StandardCharsets.UTF_8));
                        output.flush();
                        saved = true;
                    }
                } catch (IOException | SecurityException ignored) {
                    saved = false;
                }
            }
            notifyBackupExportResult(saved);
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    private void handleBackNavigation() {
        if (handlingBack) return;
        if (webView == null) {
            finish();
            return;
        }
        handlingBack = true;
        // Close the active in-game dialog before leaving the app. This keeps the
        // settings, tutorial, level map, and completion panel behaving like native
        // Android screens when the system Back gesture/button is used.
        webView.evaluateJavascript(
            "(function(){var d=document.querySelector('dialog[open]');if(d){if(typeof d.close==='function')d.close();else d.removeAttribute('open');return 'closed'}return 'none'})()",
            result -> {
                handlingBack = false;
                if (isFinishing() || isDestroyed()) return;
                if ("\"closed\"".equals(result)) return;
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        );
    }

    @Override
    public void onBackPressed() {
        handleBackNavigation();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
            filePathCallback = null;
        }
        pendingBackupJson = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(
                (android.window.OnBackInvokedCallback) backCallback
            );
            backCallback = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
