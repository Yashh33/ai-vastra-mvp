// app/history.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  FlatList,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { getHistory } from "../lib/api";

type HistRecord = {
  job_id: string;
  created_at: string;
  output_key: string;
  output_url?: string;
};

export default function HistoryScreen() {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistRecord[]>([]);

  // full screen viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const { width } = useWindowDimensions();

  const numCols = 3;
  const GAP = 10;
  const PADDING = 16;

  const tileSize = useMemo(() => {
    const usable = width - PADDING * 2 - GAP * (numCols - 1);
    return Math.floor(usable / numCols);
  }, [width]);

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

  function renderHeader() {
    return (
      <View style={styles.headerWrap}>
        {/* ✅ Header layout same as Heroes (SafeArea-friendly) */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.headerBtnPad}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>

          <Pressable onPress={refresh} style={styles.headerBtnPad}>
            <Text style={styles.refresh}>Refresh</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Output History</Text>
        <Text style={styles.sub}>Tap any output to view full screen.</Text>

        {loading ? (
          <View style={{ marginTop: 10, marginBottom: 6 }}>
            <ActivityIndicator />
          </View>
        ) : null}
      </View>
    );
  }

  function renderItem({ item }: { item: HistRecord }) {
    const uri = item.output_url;

    // If a record is missing output_url, keep it non-clickable but still visible.
    return (
      <View style={[styles.tileWrap, { width: tileSize, marginBottom: GAP }]}>
        {uri ? (
          <Pressable onPress={() => openViewer(uri)} style={[styles.tile, { width: tileSize, height: tileSize }]}>
            <Image source={{ uri }} style={styles.tileImage} resizeMode="cover" />
          </Pressable>
        ) : (
          <View style={[styles.tile, { width: tileSize, height: tileSize, justifyContent: "center", alignItems: "center" }]}>
            <Text style={{ opacity: 0.6, fontSize: 11, textAlign: "center", paddingHorizontal: 6 }}>
              Missing output_url
            </Text>
          </View>
        )}

        <Text style={styles.fileName} numberOfLines={1}>
          {item.job_id.slice(0, 12)}…
        </Text>
      </View>
    );
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

      <SafeAreaView style={styles.safe}>
        <FlatList
          data={history}
          keyExtractor={(item) => item.job_id}
          numColumns={numCols}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={{ gap: GAP }}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={loading ? null : <Text style={styles.muted}>No outputs yet</Text>}
          renderItem={renderItem}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f6f6" },

  listContainer: { padding: 16, paddingBottom: 40 },

  headerWrap: { paddingBottom: 8 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 6, paddingBottom: 6 },
  headerBtnPad: { paddingVertical: 6, paddingHorizontal: 6 },

  back: { fontWeight: "900" },
  refresh: { fontWeight: "900", color: "#0a7" },

  title: { fontSize: 22, fontWeight: "900", marginTop: 12 },
  sub: { marginTop: 4, opacity: 0.7, marginBottom: 12 },

  muted: { opacity: 0.6, marginTop: 12 },

  tileWrap: { flexGrow: 0 },
  tile: {
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },
  tileImage: { width: "100%", height: "100%" },
  fileName: { marginTop: 6, fontSize: 11, opacity: 0.6 },

  viewerWrap: { flex: 1, backgroundColor: "#000" },
  viewerHeader: { padding: 12, alignItems: "flex-end" },
  viewerCloseBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#222" },
  viewerCloseText: { color: "white", fontWeight: "800" },
  viewerBody: { flex: 1, justifyContent: "center", alignItems: "center" },
  viewerImage: { width: "100%", height: "100%" },
});
