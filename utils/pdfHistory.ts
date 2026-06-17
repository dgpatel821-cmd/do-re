import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'multikit_pdf_history';

export type PdfTool = 'Image to PDF' | 'Camera to PDF' | 'PDF Merge' | 'PDF to Image' | 'PDF Lock' | 'PDF Unlock' | 'PDF Compress';

export interface PdfRecord {
  id: string;
  name: string;
  uri: string;       // cache URI (may expire on restart)
  tool: PdfTool;
  size?: number;     // bytes
  createdAt: number; // Date.now()
  thumbnailUri?: string; // URI of first image for thumbnail preview
}

/** Save a newly created PDF to history */
export async function savePdfRecord(
  record: Omit<PdfRecord, 'id'>
): Promise<void> {
  try {
    const existing = await getPdfHistory();
    const newRecord: PdfRecord = {
      ...record,
      id: Math.random().toString(36).substr(2, 9),
    };
    // keep newest first, max 100 entries
    const updated = [newRecord, ...existing].slice(0, 100);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('savePdfRecord failed', e);
  }
}

/** Get all PDF history records */
export async function getPdfHistory(): Promise<PdfRecord[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/** Delete a single record by id */
export async function deletePdfRecord(id: string): Promise<void> {
  try {
    const existing = await getPdfHistory();
    const updated = existing.filter(r => r.id !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('deletePdfRecord failed', e);
  }
}

/** Clear all history */
export async function clearPdfHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.error('clearPdfHistory failed', e);
  }
}

/** Format bytes to readable size string */
export function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** Format timestamp to readable date */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, '0');
  const mon = (d.getMonth() + 1).toString().padStart(2, '0');
  const yr  = d.getFullYear();
  const hr  = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${mon}/${yr}  ${hr}:${min}`;
}
