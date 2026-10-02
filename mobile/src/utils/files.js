/** Pick images / documents on the device and return { uri, name, type, size } for the API layer. */
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

const normalize = (a) => ({
  uri: a.uri,
  name: a.fileName || a.name || a.uri.split('/').pop() || 'upload',
  type: a.mimeType || a.type || 'application/octet-stream',
  size: a.fileSize ?? a.size ?? 0,
});

/** Choose a picture from the photo library. Returns null if cancelled. */
export async function pickImage() {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
  return res.canceled ? null : normalize(res.assets[0]);
}

/** Take a photo with the camera (asks for permission). Returns null if cancelled/denied. */
export async function takePhoto() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Camera permission was denied. Allow camera access in your phone settings.');
  const res = await ImagePicker.launchCameraAsync({ quality: 0.85 });
  return res.canceled ? null : normalize(res.assets[0]);
}

/** Choose a PDF / DOCX / TXT / image / video file. Returns null if cancelled. */
export async function pickDocument() {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'video/mp4', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'image/*'],
    copyToCacheDirectory: true,
  });
  return res.canceled ? null : normalize(res.assets[0]);
}

export const extOf = (name = '') => (name.split('.').pop() || '').toLowerCase();
