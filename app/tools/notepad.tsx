import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trash2, Plus, Pen, ChevronRight, X, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const STORAGE_KEY = '@multikit_notepad_notes';

export default function NotepadScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  
  // State variables
  const [notes, setNotes] = useState<Note[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  
  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setNotes(JSON.parse(data));
      }
    } catch (e) {
      console.error('Failed to load notes', e);
    }
  };

  const saveNotesToStorage = async (updatedNotes: Note[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
      setNotes(updatedNotes);
    } catch (e) {
      Alert.alert('Error', 'Failed to save note to storage.');
    }
  };

  const handleOpenAddNote = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setIsEditorOpen(true);
    triggerHaptic('light');
  };

  const handleOpenEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setIsEditorOpen(true);
    triggerHaptic('light');
  };

  const handleSaveNote = () => {
    if (!noteTitle.trim()) {
      Alert.alert('Heading Required', 'Please enter a heading for your note.');
      return;
    }

    let updatedNotes: Note[];
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (editingNoteId) {
      // Edit existing note
      updatedNotes = notes.map((note) =>
        note.id === editingNoteId
          ? { ...note, title: noteTitle.trim(), content: noteContent.trim(), createdAt: formattedDate }
          : note
      );
      triggerHaptic('notificationSuccess');
    } else {
      // Create new note
      const newNote: Note = {
        id: Date.now().toString(),
        title: noteTitle.trim(),
        content: noteContent.trim(),
        createdAt: formattedDate,
      };
      updatedNotes = [newNote, ...notes];
      triggerHaptic('notificationSuccess');
    }

    saveNotesToStorage(updatedNotes);
    setIsEditorOpen(false);
  };

  const handleDeleteNote = (id: string, title: string) => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = notes.filter((n) => n.id !== id);
            saveNotesToStorage(updated);
            if (isEditorOpen && editingNoteId === id) {
              setIsEditorOpen(false);
            }
            triggerHaptic('impactHeavy');
          },
        },
      ]
    );
  };

  const triggerHaptic = (type: 'light' | 'impactHeavy' | 'notificationSuccess') => {
    if (Platform.OS !== 'web') {
      if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === 'impactHeavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === 'notificationSuccess') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (isEditorOpen) {
              setIsEditorOpen(false);
              triggerHaptic('light');
            } else {
              router.back();
            }
          }}
          style={styles.backBtn}
        >
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {isEditorOpen ? (editingNoteId ? 'Edit Note' : 'New Note') : 'My Notepad 📝'}
        </Text>

        {isEditorOpen ? (
          editingNoteId ? (
            <TouchableOpacity 
              onPress={() => handleDeleteNote(editingNoteId, noteTitle)} 
              style={styles.deleteHeaderBtn} 
              activeOpacity={0.7}
            >
              <Trash2 size={22} color="#EF4444" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {isEditorOpen ? (
        // PREMIUM FULL SCREEN EDITOR MODE
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.editorContainer, { backgroundColor: theme.background }]}
        >
          <ScrollView
            style={styles.editorScrollView}
            contentContainerStyle={styles.editorContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              style={[styles.titleInput, { color: theme.text }]}
              placeholder="Heading"
              value={noteTitle}
              onChangeText={setNoteTitle}
              placeholderTextColor="#94A3B8"
              maxLength={80}
              autoFocus={!editingNoteId}
            />
            
            <View style={styles.metadataContainer}>
              <Text style={[styles.metadataText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                {editingNoteId 
                  ? `Updated: ${notes.find(n => n.id === editingNoteId)?.createdAt || ''}`
                  : `Created: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
              </Text>
              <Text style={[styles.metadataText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                {noteContent.length} {noteContent.length === 1 ? 'char' : 'chars'} • {noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0} {noteContent.trim() ? noteContent.trim().split(/\s+/).length === 1 ? 'word' : 'words' : 'words'}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            
            <TextInput
              style={[styles.contentInput, { color: isDark ? '#E2E8F0' : '#383838' }]}
              placeholder="Write your note details here..."
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              placeholderTextColor="#94A3B8"
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Sticky Bottom Action Bar */}
          <View style={[styles.editorBottomBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.editorCancelBtn, { backgroundColor: isDark ? '#262626' : '#F1F5F9', borderColor: theme.border }]}
              onPress={() => {
                setIsEditorOpen(false);
                triggerHaptic('light');
              }}
              activeOpacity={0.8}
            >
              <X size={18} color={isDark ? '#94A3B8' : '#64748B'} />
              <Text style={[styles.editorCancelBtnText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editorSaveBtn}
              onPress={handleSaveNote}
              activeOpacity={0.8}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.editorSaveBtnText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        // NOTES LIST MODE
        <View style={[styles.listWrapper, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
          {notes.length === 0 ? (
            // EMPTY STATE
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrapper, { backgroundColor: isDark ? '#2E2F5E' : '#EEF2FF' }]}>
                <Pen size={44} color="#6366F1" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Notes Yet</Text>
              <Text style={[styles.emptyText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Create notes here to keep track of your thoughts. Save them with a heading and details.
              </Text>
              <TouchableOpacity style={styles.startBtn} onPress={handleOpenAddNote} activeOpacity={0.8}>
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.startBtnText}>Start Writing</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // NOTES LIST
            <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
              {notes.map((note) => (
                <TouchableOpacity
                  key={note.id}
                  style={[styles.noteCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  activeOpacity={0.75}
                  onPress={() => handleOpenEditNote(note)}
                >
                  <View style={styles.noteContentArea}>
                    <Text style={[styles.noteTitle, { color: theme.text }]} numberOfLines={1}>
                      {note.title}
                    </Text>
                    <Text style={[styles.notePreview, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={2}>
                      {note.content ? note.content : 'No additional content'}
                    </Text>
                    <Text style={[styles.noteDate, { color: isDark ? '#64748B' : '#94A3B8' }]}>{note.createdAt}</Text>
                  </View>
                  
                  {/* Delete Button */}
                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: isDark ? '#451A1A' : '#FEF2F2' }]}
                    onPress={() => handleDeleteNote(note.id, note.title)}
                    activeOpacity={0.6}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <View style={{ height: 80 }} />
            </ScrollView>
          )}

          {/* Floating plus button at bottom right (only when notes exist) */}
          {notes.length > 0 && (
            <TouchableOpacity style={styles.fab} onPress={handleOpenAddNote} activeOpacity={0.85}>
              <Plus size={26} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  saveHeaderBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  saveHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  listWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Slate background for listing view
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  noteContentArea: {
    flex: 1,
    marginRight: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  notePreview: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 18,
  },
  noteDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  editorContainer: {
    flex: 1,
  },
  editorScrollView: {
    flex: 1,
  },
  editorContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 8,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  metadataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  divider: {
    height: 1.5,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  contentInput: {
    fontSize: 16,
    color: '#383838',
    lineHeight: 24,
    paddingVertical: 8,
    minHeight: 300,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  editorBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 10,
  },
  editorCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 0.35,
  },
  editorCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  editorSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    flex: 0.6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  editorSaveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteHeaderBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
