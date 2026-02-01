import React, { useEffect, useMemo, useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import { clearSession, me, uploadImage, generateReal, getHistory } from "../lib/api";
import * as ImageManipulator from "expo-image-manipulator";

type HistRecord = {
  job_id: string;
  created_at: string;
  output_key: string;
};

export default function Home() {
  const [shopId, setShopId] = useState<string>("");

  const [fabricUri, setFabricUri] = useState<string | null>(null);
  const [heroUri, setHeroUri] = useState<string | null>(null);

  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<HistRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ✅ Full screen viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await me();
        setShopId(res.shop_id);
        await refreshHistory();
      } catch {
        Alert.alert("Session expired", "Please login again.");
        router.replace("/");
      }
    })();
  }, []);

  async function refreshHistory() {
    setHistoryLoading(true);
    try {
      const h = await getHistory();
      setHistory(h.records || []);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }

  async function convertToJpg(uri: string) {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [], // no resize for now
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  }

  async function pickImage(setter: (v: string) => void) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo access.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!res.canceled) {
      const originalUri = res.assets[0].uri;
      const jpgUri = await convertToJpg(originalUri);
      setter(jpgUri);
    }
  }

  function openViewer(uri: string) {
    setViewerUri(uri);
    setViewerOpen(true);
  }

  function closeViewer() {
    setViewerOpen(false);
    // keep uri for a moment to avoid flicker on close animation
    setTimeout(() => setViewerUri(null), 150);
  }

  async function onGenerate() {
    if (!fabricUri || !heroUri) {
      Alert.alert("Missing images", "Please select both Fabric and Hero images.");
      return;
    }

    setLoading(true);
    setOutputUrl(null);

    try {
      // 1) upload fabric
      const upFabric = await uploadImage(fabricUri, "fabric");
      // 2) upload hero
      const upHero = await uploadImage(heroUri, "hero");
      // 3) User Prompt
      const prompt =
      "Create a photorealistic image of the HERO garment made from the FABRIC cloth. " +
      "Keep the HERO person, pose, face, hair, skin tone, lighting, shadows, and background unchanged. " +
      "Only the garment fabric should change. Preserve seams, stitching, folds, wrinkles, and natural shading. " +
      "Make it look like real tailored clothing, not a pasted texture or Photoshop overlay.";
      // 4) generate dummy
      const gen = await generateReal(upFabric.key, upHero.key, prompt);


      setOutputUrl(gen.output_url);
      await refreshHistory();
      Alert.alert("Done", "Dummy image generated and saved to history.");
    } catch (e: any) {
      Alert.alert("Generate failed", e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await clearSession();
    router.replace("/");
  }

  return (
    <>
      {/* ✅ Full-screen image modal */}
      <Modal visible={viewerOpen} animationType="fade" transparent={false} onRequestClose={closeViewer}>
        <SafeAreaView style={styles.viewerWrap}>
          <View style={styles.viewerHeader}>
            <Pressable style={styles.viewerCloseBtn} onPress={closeViewer}>
              <Text style={styles.viewerCloseText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.viewerBody}>
            {viewerUri ? (
              <Image
                source={{ uri: viewerUri }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
            ) : (
              <ActivityIndicator />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>AI Vastra</Text>
            <Text style={styles.sub}>Shop: {shopId || "..."}</Text>
          </View>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1) Select Fabric Image</Text>
          {fabricUri ? (
            <Pressable onPress={() => openViewer(fabricUri)}>
              <Image source={{ uri: fabricUri }} style={styles.preview} />
            </Pressable>
          ) : (
            <Text style={styles.muted}>No fabric selected</Text>
          )}
          <Pressable style={styles.btn} onPress={() => pickImage((u) => setFabricUri(u))}>
            <Text style={styles.btnText}>Pick Fabric</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2) Select Hero Image</Text>
          {heroUri ? (
            <Pressable onPress={() => openViewer(heroUri)}>
              <Image source={{ uri: heroUri }} style={styles.preview} />
            </Pressable>
          ) : (
            <Text style={styles.muted}>No hero selected</Text>
          )}
          <Pressable style={styles.btn} onPress={() => pickImage((u) => setHeroUri(u))}>
            <Text style={styles.btnText}>Pick Hero</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.generateBtn, loading && { opacity: 0.6 }]}
          onPress={onGenerate}
          disabled={loading}
        >
          {loading ? <ActivityIndicator /> : <Text style={styles.generateText}>Generate</Text>}
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Output</Text>

          {outputUrl ? (
            <Pressable onPress={() => openViewer(outputUrl)}>
              <Image source={{ uri: outputUrl }} style={styles.output} />
              <Text style={styles.tapHint}>Tap image to view full screen</Text>
            </Pressable>
          ) : (
            <Text style={styles.muted}>No output yet</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.historyRow}>
            <Text style={styles.sectionTitle}>History</Text>
            <Pressable onPress={refreshHistory}>
              <Text style={styles.link}>Refresh</Text>
            </Pressable>
          </View>

          {historyLoading ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : history.length === 0 ? (
            <Text style={styles.muted}>No history yet</Text>
          ) : (
            history.map((h) => (
              <View key={h.job_id} style={styles.historyItem}>
                <Text style={styles.historyJob}>Job: {h.job_id.slice(0, 8)}…</Text>
                <Text style={styles.mutedSmall}>{h.created_at}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footerHint}>
          Note: Output URL is signed and expires in ~1 hour. History is stored in R2.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "800" },
  sub: { marginTop: 2, opacity: 0.7 },

  logoutBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#eee" },
  logoutText: { fontWeight: "700" },

  card: { backgroundColor: "white", borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: "#eee" },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  muted: { opacity: 0.6 },
  mutedSmall: { opacity: 0.6, fontSize: 12 },

  preview: { width: "100%", height: 220, borderRadius: 12, backgroundColor: "#f3f3f3", marginBottom: 10 },
  output: { width: "100%", height: 320, borderRadius: 12, backgroundColor: "#f3f3f3" },

  btn: { marginTop: 8, backgroundColor: "#111", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnText: { color: "white", fontWeight: "800" },

  generateBtn: { marginTop: 14, backgroundColor: "#0a7", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  generateText: { color: "white", fontSize: 16, fontWeight: "900" },

  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  link: { color: "#0a7", fontWeight: "800" },
  historyItem: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#eee" },
  historyJob: { fontWeight: "800" },

  footerHint: { marginTop: 14, opacity: 0.6, fontSize: 12, textAlign: "center" },

  tapHint: { marginTop: 8, opacity: 0.6, fontSize: 12 },

  // ✅ Full screen viewer styles
  viewerWrap: { flex: 1, backgroundColor: "#000" },
  viewerHeader: { padding: 12, alignItems: "flex-end" },
  viewerCloseBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#222" },
  viewerCloseText: { color: "white", fontWeight: "800" },
  viewerBody: { flex: 1, justifyContent: "center", alignItems: "center" },
  viewerImage: { width: "100%", height: "100%" },
});




