import { Platform, StyleSheet, SafeAreaView, StatusBar, Alert } from 'react-native';
import WebView from 'react-native-webview';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorderState } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { File, Directory, Paths } from 'expo-file-system';

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
});

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const startRecord = async () => {
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    sendMessageToWebView({ type: 'onStartRecord' });
  };

  const stopRecord = async () => {
    // The recording will be available on `audioRecorder.uri`.
    if (recorderState.isRecording) {
      await audioRecorder.stop();
      const filePath = audioRecorder.uri;
      console.log('🚀 ~ stopRecord ~ filePath:', filePath);
      if (filePath) {
        try {
          const ext = filePath.split('.').pop();
          const file = new File(filePath);
          const base64audio = await file.base64();
          console.log('🚀 ~ stopRecord ~ base64audio:', base64audio);
          sendMessageToWebView({ type: 'onStopRecord', data: { audio: base64audio, ext, mimeType: 'audio/mp4' } });
        } catch (error) {
          console.error('파일 base64 인코딩 실패:', error);
        }
      }
    }
  };

  const pauseRecord = () => {
    if (recorderState.isRecording) {
      audioRecorder.pause();
      sendMessageToWebView({ type: 'onPauseRecord' });
    }
  };

  const resumeRecord = () => {
    if (!recorderState.isRecording) {
      audioRecorder.record();
      sendMessageToWebView({ type: 'onResumeRecord' });
    }
  };

  const sendMessageToWebView = ({ type, data }: { type: string; data?: any }) => {
    const message = JSON.stringify({ type, data });
    webViewRef.current?.postMessage(message);
  };

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission to access microphone was denied');
      }

      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  useEffect(() => {
    console.log('🚀 ~ App ~ recorderState.isRecording:', recorderState.isRecording);
    console.log('🚀 ~ App ~ audioRecorder.currentTime:', audioRecorder.currentTime);
  }, [audioRecorder.currentTime, recorderState.isRecording]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'http://localhost:3000' }}
        onMessage={event => {
          console.log(event.nativeEvent.data);
          const { type } = JSON.parse(event.nativeEvent.data);
          switch (type) {
            case 'start-record':
              startRecord();
              break;
            case 'stop-record':
              stopRecord();
              break;
            case 'pause-record':
              pauseRecord();
              break;
            case 'resume-record':
              resumeRecord();
              break;
            default:
              break;
          }
        }}
      />
    </SafeAreaView>
  );
}
