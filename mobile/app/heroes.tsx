// app/heroes.tsx
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
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { uploadImage, getHeroes } from "../lib/api";

type HeroItem = {
  key: string;
  url: string;
  last_modified?: string;
};

export default function HeroesScreen() {
  const [loading, setLoading] = useState(false);
  const [heroes, setHeroes] = useState<HeroItem[]>([]);

  // viewer
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
      const res = await getHeroes();
      setHeroes(res.items || []);
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Could not load heroes");
    } finally {
      setLoading(false);
    }
  }

  async function convertToJpg(uri: string) {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  }

  async function pickAndUpload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo access.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (res.canceled) return;

    try {
      setLoading(true);
      const jpgUri = await convertToJpg(res.assets[0].uri);

      // upload to kind=heroes
      await uploadImage(jpgUri, "heroes");
      await refresh();
      Alert.alert("Uploaded", "Hero image added to collection.");
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Unknown error");
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
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.headerBtnPad}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>

          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
            <Pressable onPress={refresh} style={styles.headerBtnPad}>
              <Text style={styles.refresh}>Refresh</Text>
            </Pressable>
            <Pressable onPress={pickAndUpload} style={styles.headerBtnPad}>
              <Text style={styles.add}>+ Add</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.title}>Hero Image Collection</Text>
        <Text style={styles.sub}>Upload hero images once, reuse them in Visualize.</Text>

        {loading ? (
          <View style={{ marginTop: 10, marginBottom: 6 }}>
            <ActivityIndicator />
          </View>
        ) : null}
      </View>
    );
  }

  function renderItem({ item }: { item: HeroItem }) {
    const filename = item.key.split("/").slice(-1)[0];

    return (
      <View style={[styles.tileWrap, { width: tileSize, marginBottom: GAP }]}>
        <Pressable onPress={() => openViewer(item.url)} style={[styles.tile, { width: tileSize, height: tileSize }]}>
          <Image source={{ uri: item.url }} style={styles.tileImage} resizeMode="cover" />
        </Pressable>
        <Text style={styles.fileName} numberOfLines={1}>
          {filename}
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
          data={heroes}
          keyExtractor={(item) => item.key}
          numColumns={numCols}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={{ gap: GAP }}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            loading ? null : <Text style={styles.muted}>No hero images yet. Tap “+ Add”.</Text>
          }
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

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 6,
  },

  headerBtnPad: { paddingVertical: 6, paddingHorizontal: 6 },

  back: { fontWeight: "900" },
  refresh: { fontWeight: "900", color: "#0a7" },
  add: { fontWeight: "900", color: "#111" },

  title: { fontSize: 22, fontWeight: "900", marginTop: 12 },
  sub: { marginTop: 4, opacity: 0.7, marginBottom: 12 },

  muted: { opacity: 0.6, marginTop: 12 },

  tileWrap: {
    flexGrow: 0,
  },
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
