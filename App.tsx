import { Platform, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import WebView from 'react-native-webview';

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
});

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <WebView source={{ uri: 'http://localhost:3000' }} />
    </SafeAreaView>
  );
}
