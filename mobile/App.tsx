import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import * as Network from 'expo-network'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import type {
  ShouldStartLoadRequest,
  WebViewNavigation,
} from 'react-native-webview/lib/WebViewTypes'

const DEFAULT_APP_URL = 'https://pitch-nav.vercel.app'
const APP_URL = (process.env.EXPO_PUBLIC_WEB_APP_URL || DEFAULT_APP_URL).replace(/\/$/, '')

function getHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

const APP_HOST = getHost(APP_URL)

function isAllowedInApp(url: string) {
  if (url === 'about:blank' || url.startsWith('blob:') || url.startsWith('data:')) {
    return true
  }

  const host = getHost(url)
  return (
    host === APP_HOST ||
    host.endsWith('.supabase.co') ||
    host === 'checkout.stripe.com' ||
    host.endsWith('.stripe.com')
  )
}

function getInitialWebsiteUrl(link: string | null) {
  if (!link?.startsWith('pitchnav://')) return APP_URL

  try {
    const parsed = Linking.parse(link)
    const path = [parsed.hostname, parsed.path].filter(Boolean).join('/')
    return path ? `${APP_URL}/${path}` : APP_URL
  } catch {
    return APP_URL
  }
}

function BrandedLoader() {
  return (
    <View style={styles.centered}>
      <View style={styles.mark}>
        <Text style={styles.markText}>P</Text>
      </View>
      <ActivityIndicator color="#2f6df6" size="large" />
      <Text style={styles.loadingTitle}>Pitch Nav</Text>
      <Text style={styles.loadingText}>Loading your athlete workspace…</Text>
    </View>
  )
}

function OfflineState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.centered}>
      <View style={styles.offlineIcon}>
        <Text style={styles.offlineIconText}>!</Text>
      </View>
      <Text style={styles.offlineTitle}>Connection interrupted</Text>
      <Text style={styles.offlineText}>
        Check your internet connection, then try again. Your saved Pitch Nav account data is safe.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try loading Pitch Nav again"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]}
      >
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  )
}

function PitchNavApp() {
  const webViewRef = useRef<WebView>(null)
  const [initialUrl, setInitialUrl] = useState(APP_URL)
  const [canGoBack, setCanGoBack] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const [progress, setProgress] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    Linking.getInitialURL().then((url) => setInitialUrl(getInitialWebsiteUrl(url)))

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      const destination = getInitialWebsiteUrl(url)
      webViewRef.current?.injectJavaScript(
        `window.location.href = ${JSON.stringify(destination)}; true;`,
      )
    })

    const networkSubscription = Network.addNetworkStateListener((state) => {
      const connected = state.isConnected !== false && state.isInternetReachable !== false
      setIsConnected(connected)
      if (connected) setHasError(false)
    })

    Network.getNetworkStateAsync().then((state) => {
      setIsConnected(state.isConnected !== false && state.isInternetReachable !== false)
    })

    return () => {
      linkSubscription.remove()
      networkSubscription.remove()
    }
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false
      webViewRef.current?.goBack()
      return true
    })

    return () => subscription.remove()
  }, [canGoBack])

  const retry = useCallback(() => {
    setHasError(false)
    setProgress(0)
    setReloadKey((value) => value + 1)
  }, [])

  const handleNavigation = useCallback((navigation: WebViewNavigation) => {
    setCanGoBack(navigation.canGoBack)
  }, [])

  const handleRequest = useCallback((request: ShouldStartLoadRequest) => {
    const url = request.url

    if (isAllowedInApp(url)) return true

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      Linking.openURL(url).catch(() => undefined)
      return false
    }

    return true
  }, [])

  const webSource = useMemo(() => ({ uri: initialUrl }), [initialUrl])
  const showOffline = hasError || !isConnected

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar style="light" />
      {progress > 0 && progress < 1 && !showOffline ? (
        <View style={styles.progressTrack} accessibilityRole="progressbar">
          <View style={[styles.progressBar, { width: `${Math.max(6, progress * 100)}%` }]} />
        </View>
      ) : null}

      {showOffline ? (
        <OfflineState onRetry={retry} />
      ) : (
        <WebView
          key={reloadKey}
          ref={webViewRef}
          source={webSource}
          style={styles.webView}
          originWhitelist={['https://*', 'http://*', 'about:*', 'blob:*', 'data:*']}
          onNavigationStateChange={handleNavigation}
          onShouldStartLoadWithRequest={handleRequest}
          onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
          onLoadEnd={() => setProgress(1)}
          onError={() => setHasError(true)}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.statusCode >= 500) setHasError(true)
          }}
          onFileDownload={({ nativeEvent }) => {
            Linking.openURL(nativeEvent.downloadUrl).catch(() => undefined)
          }}
          renderLoading={() => <BrandedLoader />}
          startInLoadingState
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          cacheEnabled
          incognito={false}
          pullToRefreshEnabled
          allowsBackForwardNavigationGestures
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          javaScriptCanOpenWindowsAutomatically
          setSupportMultipleWindows={false}
          mixedContentMode="never"
          applicationNameForUserAgent="PitchNavMobile/1.0"
          mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        />
      )}
    </SafeAreaView>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PitchNavApp />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  webView: {
    flex: 1,
    backgroundColor: '#020617',
  },
  progressTrack: {
    height: 3,
    width: '100%',
    backgroundColor: '#0f1d35',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#2f6df6',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#020617',
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#2f6df6',
    shadowOpacity: 0.34,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  markText: {
    color: '#0b1c3d',
    fontSize: 36,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  loadingTitle: {
    marginTop: 18,
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
  },
  loadingText: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
  offlineIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  offlineIconText: {
    color: '#f87171',
    fontSize: 34,
    fontWeight: '900',
  },
  offlineTitle: {
    color: '#f8fafc',
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
  },
  offlineText: {
    maxWidth: 420,
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 160,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: '#2f6df6',
  },
  retryPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  retryText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
})
