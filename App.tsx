import { Platform, StyleSheet, SafeAreaView, StatusBar, Alert, View, TouchableOpacity, Text } from 'react-native';
import WebView from 'react-native-webview';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorderState } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { File, Directory, Paths } from 'expo-file-system';
import { CameraView, useCameraPermissions } from 'expo-camera';

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  camera: {
    backgroundColor: 'black',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  cameraCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  cameraCloseText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cameraPhotoButton: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 80 / 2,
    bottom: 60,
    backgroundColor: 'white',
    alignSelf: 'center',
  },
});

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isCameraOn, setIsCameraOn] = useState(false);
  const cameraRef = useRef<CameraView>(null);

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

  const openCamera = async () => {
    const response = await requestCameraPermission();
    console.log('🚀 ~ openCamera ~ response:', response);
    if (response.granted) {
      setIsCameraOn(true);
    }
  };

  const closeCamera = () => {
    setIsCameraOn(false);
  };

  const onPressPhotoButton = async () => {
    const picture = await cameraRef.current?.takePictureAsync({ quality: 0 });
    const filePath = picture?.uri;
    console.log('🚀 ~ onPressPhotoButton ~ filePath:', filePath);
    if (filePath) {
      const file = new File(filePath);
      const base64Image = await file.base64();
      const imageDataUrl = `data:image/jpeg;base64, ${base64Image}`;
      sendMessageToWebView({ type: 'onTakePhoto', data: imageDataUrl });
    }
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

  // useEffect(() => {
  //   console.log('🚀 ~ App ~ recorderState.isRecording:', recorderState.isRecording);
  //   console.log('🚀 ~ App ~ audioRecorder.currentTime:', audioRecorder.currentTime);
  // }, [audioRecorder.currentTime, recorderState.isRecording]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <WebView
        ref={webViewRef}
        source={{ uri: Platform.OS === 'ios' ? 'http://localhost:3000' : 'http://10.0.2.2:3000' }}
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
            case 'open-camera':
              openCamera();
              break;
            default:
              break;
          }
        }}
      />
      {isCameraOn && (
        <View style={styles.camera}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <TouchableOpacity style={styles.cameraCloseButton} onPress={closeCamera}>
              <Text style={styles.cameraCloseText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraPhotoButton} onPress={onPressPhotoButton} />
          </CameraView>
        </View>
      )}
    </SafeAreaView>
  );
}
