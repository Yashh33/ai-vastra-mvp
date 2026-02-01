// app/history.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import { getHistory } from "../lib/api";

type HistRecord = {
  job_id: string;
  created_at: string;
  output_key: string;
  output_url?: string; // assuming backend returns it
};

export default function HistoryScreen() {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistRecord[]>([]);

  // full screen viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const h = await getHistory();
      setHistory(h.records || []);
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Could not load history");
    } finally {
      setLoading(false);
    }
  }

  function openViewer(uri: string) {
    setViewerUri(uri);
    setViewerOpen(true);
  }

  function closeViewer() {
    setViewerOpen(false);
    setTimeout(() => setViewerUri(null), 150);
  }

  return (
    <>
      <Modal visible={viewerOpen} animationType="fade" transparent={false} onRequestClose={closeViewer}>
        <SafeAreaView style={styles.viewerWrap}>
          <View style={styles.viewerHeader}>
            <Pressable style={styles.viewerCloseBtn} onPress={closeViewer}>
              <Text style={styles.viewerCloseText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.viewerBody}>
            {viewerUri ? (
              <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" />
            ) : (
              <ActivityIndicator />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <Pressable onPress={refresh}>
            <Text style={styles.refresh}>Refresh</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Output History</Text>
        <Text style={styles.sub}>Tap any output to view full screen.</Text>

        {loading ? (
          <View style={{ marginTop: 16 }}>
            <ActivityIndicator />
          </View>
        ) : history.length === 0 ? (
          <Text style={styles.muted}>No outputs yet</Text>
        ) : (
          history.map((h) => {
            const uri = h.output_url; // if missing, we’ll fix later
            return (
              <View key={h.job_id} style={styles.card}>
                <Text style={styles.meta}>Job: {h.job_id.slice(0, 8)}…</Text>
                <Text style={styles.mutedSmall}>{h.created_at}</Text>

                {uri ? (
                  <Pressable onPress={() => openViewer(uri)}>
                    <Image source={{ uri }} style={styles.preview} />
                    <Text style={styles.tapHint}>Tap to open</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.muted}>Missing output_url for this record</Text>
                )}

                {/* Download button will be added next step */}
              </View>
            );
          })
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { fontWeight: "900" },
  refresh: { fontWeight: "900", color: "#0a7" },

  title: { fontSize: 22, fontWeight: "900", marginTop: 12 },
  sub: { marginTop: 4, opacity: 0.7, marginBottom: 12 },

  card: { backgroundColor: "white", borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: "#eee" },
  preview: { width: "100%", height: 320, borderRadius: 12, backgroundColor: "#f3f3f3", marginTop: 10 },

  meta: { fontWeight: "900" },
  muted: { opacity: 0.6, marginTop: 10 },
  mutedSmall: { opacity: 0.6, fontSize: 12 },
  tapHint: { marginTop: 8, opacity: 0.6, fontSize: 12 },

  viewerWrap: { flex: 1, backgroundColor: "#000" },
  viewerHeader: { padding: 12, alignItems: "flex-end" },
  viewerCloseBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#222" },
  viewerCloseText: { color: "white", fontWeight: "800" },
  viewerBody: { flex: 1, justifyContent: "center", alignItems: "center" },
  viewerImage: { width: "100%", height: "100%" },
});
