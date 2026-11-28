package com.maizecrush.zimbabweharvest;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.WebChromeClient;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;
import androidx.webkit.WebViewAssetLoader;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;
    private static final int CREATE_BACKUP_REQUEST_CODE = 1002;
    private static final int MAX_BACKUP_BYTES = 1024 * 1024;
    private static final int MAX_AUTOMATIC_RENDERER_RECOVERIES = 2;
    private static final String GAME_URL = "https://appassets.androidplatform.net/assets/index.html";

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private String pendingBackupJson;
    private Object backCallback;
    private boolean handlingBack;
    private boolean activityResumed;
    private int rendererRecoveryAttempts;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(11, 33, 24));
        getWindow().setNavigationBarColor(Color.rgb(11, 33, 24));
        getWindow().getDecorView().setSystemUiVisibility(0);

        webView = createGameWebView();
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
            webView.loadUrl(GAME_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private WebView createGameWebView() {
        WebView view = new WebView(this);
        view.setBackgroundColor(Color.rgb(11, 33, 24));
        view.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadsImagesAutomatically(true);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        view.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView requestView, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView requestView, String url) {
                return assetLoader.shouldInterceptRequest(Uri.parse(url));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView requestView, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                String url = uri.toString();

                // The JavaScript backup bridge must only be reachable from bundled,
                // trusted game assets. Never let a remote or arbitrary local page
                // take over this WebView.
                if ("file".equalsIgnoreCase(scheme)) return true;

                // Only the appassets HTTPS origin is allowed inside the bridge-enabled WebView.
                // WebViewAssetLoader serves bundled files from this secure origin, so Babylon can
                // fetch local GLB models without enabling file-to-file URL access.
                if ("https".equalsIgnoreCase(scheme) && "appassets.androidplatform.net".equalsIgnoreCase(uri.getHost())) return false;

                // Open all other web links externally instead of navigating the trusted game origin.
                if ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (ActivityNotFoundException | SecurityException ignored) {
                        // Keep the game usable even if the device has no browser available.
                    }
                    return true;
                }

                // Block unsupported schemes (intent:, content:, javascript:, etc.).
                return true;
            }

            @Override
            public void onPageCommitVisible(WebView committedView, String url) {
                if (committedView == webView) {
                    // A fresh page commit proves that the replacement renderer recovered.
                    rendererRecoveryAttempts = 0;
                }
            }

            @Override
            public boolean onRenderProcessGone(WebView crashedView, RenderProcessGoneDetail detail) {
                return recoverFromRendererLoss(crashedView);
            }
        });

        view.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                WebView requestView,
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
        view.addJavascriptInterface(new BackupBridge(), "MaizeCrushNative");

        // Android 15+ enforces edge-to-edge for modern target SDKs. Apply system-bar
        // and display-cutout insets to every replacement WebView as well.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            view.setOnApplyWindowInsetsListener((target, windowInsets) -> {
                Insets safeInsets = windowInsets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout()
                );
                target.setPadding(safeInsets.left, safeInsets.top, safeInsets.right, safeInsets.bottom);
                return windowInsets;
            });
        }
        return view;
    }

    private boolean recoverFromRendererLoss(WebView crashedView) {
        // A stale callback must never replace or destroy the currently active WebView.
        if (crashedView != webView) {
            destroyWebView(crashedView);
            return true;
        }

        webView = null;
        if (filePathCallback != null) {
            try {
                filePathCallback.onReceiveValue(null);
            } catch (RuntimeException ignored) {
                // The callback may already belong to the dead renderer.
            }
            filePathCallback = null;
        }
        pendingBackupJson = null;
        handlingBack = false;
        destroyWebView(crashedView);

        if (isFinishing() || isDestroyed()) return true;

        // Retry automatically, but stop after repeated crashes before a page commits.
        // The retry screen remains available without discarding the localStorage checkpoint.
        if (rendererRecoveryAttempts >= MAX_AUTOMATIC_RENDERER_RECOVERIES) {
            showRendererRecoveryFallback();
            return true;
        }
        rendererRecoveryAttempts++;
        attachFreshGameWebView();
        return true;
    }

    private void destroyWebView(WebView target) {
        if (target == null) return;
        try {
            if (target.getParent() instanceof ViewGroup) {
                ((ViewGroup) target.getParent()).removeView(target);
            }
        } catch (RuntimeException ignored) {
            // Continue releasing the renderer even if the view was already detached.
        }
        try {
            target.stopLoading();
        } catch (RuntimeException ignored) {
            // A terminated renderer may reject further WebView calls.
        }
        try {
            target.removeJavascriptInterface("MaizeCrushNative");
        } catch (RuntimeException ignored) {
            // The interface is discarded with the WebView if removal is unavailable.
        }
        try {
            target.destroy();
        } catch (RuntimeException ignored) {
            // The renderer has already been terminated by Android.
        }
    }

    private void attachFreshGameWebView() {
        try {
            WebView replacement = createGameWebView();
            webView = replacement;
            setContentView(replacement);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                replacement.requestApplyInsets();
            }
            if (!activityResumed) {
                replacement.onPause();
                replacement.pauseTimers();
            }
            // Reload only the bundled HTTPS origin. DOM storage is origin-scoped and
            // the game restores its last validated stable-round checkpoint on startup.
            replacement.loadUrl(GAME_URL);
        } catch (RuntimeException error) {
            if (webView != null) {
                WebView failed = webView;
                webView = null;
                destroyWebView(failed);
            }
            showRendererRecoveryFallback();
        }
    }

    private void showRendererRecoveryFallback() {
        TextView fallback = new TextView(this);
        fallback.setText(
            "Maize Crush needs to restart its game view.\n\n" +
            "Your last stable harvest is saved on this device. Tap to try again."
        );
        fallback.setTextSize(18f);
        fallback.setTextColor(Color.WHITE);
        fallback.setGravity(Gravity.CENTER);
        fallback.setPadding(40, 40, 40, 40);
        fallback.setBackgroundColor(Color.rgb(11, 33, 24));
        fallback.setFocusable(true);
        fallback.setClickable(true);
        fallback.setContentDescription("Retry Maize Crush after a rendering problem");
        fallback.setOnClickListener(view -> {
            rendererRecoveryAttempts = 0;
            attachFreshGameWebView();
        });
        setContentView(fallback);
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

    private void pauseWebViewAfterCheckpoint(WebView target) {
        if (target == null || target != webView || activityResumed) return;
        target.onPause();
        target.pauseTimers();
    }

    @Override
    protected void onPause() {
        activityResumed = false;
        WebView current = webView;
        if (current != null) {
            // Run the synchronous localStorage checkpoint in the WebView before
            // pausing its renderer and JavaScript timers. The callback also guards
            // against a quick return to the foreground before it completes.
            try {
                current.evaluateJavascript(
                    "if(typeof window.maizeCrushPrepareForBackground==='function'){window.maizeCrushPrepareForBackground();}true;",
                    result -> pauseWebViewAfterCheckpoint(current)
                );
            } catch (RuntimeException ignored) {
                pauseWebViewAfterCheckpoint(current);
            }
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        activityResumed = true;
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
        }
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
            WebView current = webView;
            webView = null;
            destroyWebView(current);
        }
        super.onDestroy();
    }
}
