import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Upload, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function IDScanScreen({ onComplete, navigation }) {
  const [scanMode, setScanMode] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanAnimation] = useState(new Animated.Value(0));

  const handleScan = (mode) => {
    setScanMode(mode);
    setIsScanning(true);

    // Start scanning animation
    Animated.loop(
      Animated.timing(scanAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false, // Changed to false for layout animations
      })
    ).start();

    // Simulate scanning
    setTimeout(() => {
      setIsScanning(false);
      scanAnimation.stopAnimation();
      const success = Math.random() > 0.3;
      setScanResult(success ? 'success' : 'failed');

      if (success) {
        setTimeout(() => {
          // Call onComplete callback to trigger verification state change
          if (onComplete) {
            onComplete(true);
          }
        }, 2000);
      }
    }, 2500);
  };

  const handleRetry = () => {
    setScanMode(null);
    setScanResult(null);
    scanAnimation.setValue(0);
  };

  const scanLinePosition = scanAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300], // Use numeric values instead of percentages
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Header */}
        {!scanMode && (
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Bartender AI</Text>
            <Text style={styles.subtitle}>
              We need to verify your age before we can serve you
            </Text>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.mainContent}>
          {!scanMode && (
            <View style={styles.selectMode}>
              {/* Warning Box */}
              <View style={styles.warningBox}>
                <AlertTriangle color="#F59E0B" size={20} />
                <View style={styles.warningText}>
                  <Text style={styles.warningTitle}>Age Verification Required</Text>
                  <Text style={styles.warningSubtitle}>
                    You must be 21+ to use this service. {"\n"}
                    Your ID will be verified and not stored.
                  </Text>
                </View>
              </View>

              {/* Scan Options */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleScan('camera')}
                activeOpacity={0.8}
              >
                <Camera color="#0A0A0A" size={20} />
                <Text style={styles.primaryButtonText}>Scan ID with Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleScan('upload')}
                activeOpacity={0.8}
              >
                <Upload color="#000000ff" size={20} />
                <Text style={styles.secondaryButtonText}>Upload ID Photo</Text>
              </TouchableOpacity>

              {/* Legal Text */}
              <Text style={styles.legalText}>
                By continuing, you agree to our Terms of Service and confirm you are of legal
                drinking age. Please drink responsibly.
              </Text>
            </View>
          )}

          {scanMode && !scanResult && (
            <View style={styles.scanningMode}>
              {/* Scanner Frame */}
              <View style={styles.scannerFrame}>
                {/* Scanning Line */}
                {isScanning && (
                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        top: scanLinePosition,
                      },
                    ]}
                  />
                )}

                {/* Corner Brackets */}
                <View style={[styles.bracket, styles.bracketTopLeft]} />
                <View style={[styles.bracket, styles.bracketTopRight]} />
                <View style={[styles.bracket, styles.bracketBottomLeft]} />
                <View style={[styles.bracket, styles.bracketBottomRight]} />

                {/* Icon */}
                <View style={styles.scanIcon}>
                  {scanMode === 'camera' ? (
                    <Camera color="#F59E0B" size={64} opacity={0.3} />
                  ) : (
                    <Upload color="#14B8A6" size={64} opacity={0.3} />
                  )}
                </View>
              </View>

              <View style={styles.scanningText}>
                <Text style={styles.scanningTitle}>Scanning ID...</Text>
                <Text style={styles.scanningSubtitle}>Please hold steady</Text>
              </View>
            </View>
          )}

          {scanResult && (
            <View style={styles.resultMode}>
              <View style={styles.resultIcon}>
                {scanResult === 'success' ? (
                  <CheckCircle2 color="#14B8A6" size={96} />
                ) : (
                  <XCircle color="#DC2626" size={96} />
                )}
              </View>

              <Text
                style={[
                  styles.resultTitle,
                  { color: scanResult === 'success' ? '#14B8A6' : '#DC2626' },
                ]}
              >
                {scanResult === 'success' ? 'Verification Successful!' : 'Verification Failed'}
              </Text>

              <Text style={styles.resultSubtitle}>
                {scanResult === 'success'
                  ? "Welcome! You're all set to order drinks."
                  : "We couldn't verify your ID. Please try again or use a different method."}
              </Text>

              {scanResult === 'failed' && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleRetry}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your ID is encrypted and verified in real-time. {'\n'}
            No personal data is stored.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#A3A3A3',
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  selectMode: {
    width: '100%',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  warningText: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    color: '#F5F5F5',
    fontWeight: '600',
    marginBottom: 4,
  },
  warningSubtitle: {
    fontSize: 12,
    color: '#A3A3A3',
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#40E0D0',
    borderWidth: 1,
    borderColor: '#40E0D0',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000ff',
  },
  legalText: {
    fontSize: 12,
    color: '#717182',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  scanningMode: {
    alignItems: 'center',
  },
  scannerFrame: {
    width: width - 48,
    aspectRatio: 3 / 2,
    backgroundColor: 'rgba(38, 38, 38, 0.8)',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#F59E0B',
  },
  bracket: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  bracketTopLeft: {
    top: 16,
    left: 16,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  bracketTopRight: {
    top: 16,
    right: 16,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bracketBottomLeft: {
    bottom: 16,
    left: 16,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bracketBottomRight: {
    bottom: 16,
    right: 16,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    alignItems: 'center',
  },
  scanningTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5F5',
    marginBottom: 8,
  },
  scanningSubtitle: {
    fontSize: 14,
    color: '#A3A3A3',
  },
  resultMode: {
    alignItems: 'center',
  },
  resultIcon: {
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#A3A3A3',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(38, 38, 38, 0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(217, 119, 6, 0.2)',
  },
  footerText: {
    fontSize: 12,
    color: '#717182',
    textAlign: 'center',
  },
});