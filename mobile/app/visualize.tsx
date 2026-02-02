// app/visualize.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { uploadImage, generateReal } from "../lib/api";

export default function VisualizeScreen() {
  // If user returns from heroes-pick, we get these params
  const params = useLocalSearchParams<{
    hero_key?: string;
    hero_url?: string;
    fabric_uri?: string;
  }>();

  const [fabricUri, setFabricUri] = useState<string | null>(null);
  const [heroKey, setHeroKey] = useState<string | null>(params.hero_key || null);
  const [heroUrl, setHeroUrl] = useState<string | null>(params.hero_url || null);

  const [loading, setLoading] = useState(false);

  // Keep state synced if params change (e.g., user picks hero again)
  useMemo(() => {
    if (params.hero_key && params.hero_key !== heroKey) setHeroKey(params.hero_key);
    if (params.hero_url && params.hero_url !== heroUrl) setHeroUrl(params.hero_url);
    if (params.fabric_uri && !fabricUri) setFabricUri(params.fabric_uri);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.hero_key, params.hero_url]);

  async function convertToJpg(uri: string) {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  }

  async function pickFabricFromGallery() {
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
      setFabricUri(jpgUri);
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Could not select fabric");
    } finally {
      setLoading(false);
    }
  }

  async function captureFabricFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (res.canceled) return;

    try {
      setLoading(true);
      const jpgUri = await convertToJpg(res.assets[0].uri);
      setFabricUri(jpgUri);
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Could not capture fabric");
    } finally {
      setLoading(false);
    }
  }

  function openHeroPicker() {
    // Navigate to picker screen
    // router.push("/heroes-pick" as Href);
    router.push({
    pathname: "/heroes-pick",
    params: fabricUri ? { fabric_uri: fabricUri } : {},
  } as unknown as Href);
  }

  async function onGenerate() {
    if (!fabricUri) {
      Alert.alert("Missing Fabric", "Please pick or capture a fabric image.");
      return;
    }
    if (!heroKey || !heroUrl) {
      Alert.alert("Missing Hero", "Please pick a hero image.");
      return;
    }

    try {
      setLoading(true);

      // 1) Upload fabric (kind=fabric)
      const up = await uploadImage(fabricUri, "fabric");
      const fabric_key = up.key;

      // 2) Generate using selected hero_key
      const gen = await generateReal(fabric_key, heroKey);

      // 3) Go to Output screen (1.1.2)
      router.push({
        pathname: "/output",
        params: {
          output_url: gen.output_url,
          output_key: gen.output_key,
          job_id: gen.job_id,
        },
      }as unknown as Href);
    } catch (e: any) {
      Alert.alert("Generate failed", e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.headerBtnPad}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Visualize</Text>
      <Text style={styles.sub}>Pick Fabric → Pick Hero → Generate</Text>

      {/* 3 Sections: 40 / 40 / 20 */}
      <View style={styles.sectionsWrap}>
        {/* (a) Fabric - top 40% */}
        <View style={[styles.sectionCard, { flex: 4 }]}>
          <Text style={styles.sectionTitle}>1) Fabric</Text>

          <View style={styles.btnRow}>
            <Pressable style={styles.btn} onPress={pickFabricFromGallery} disabled={loading}>
              <Text style={styles.btnText}>Pick Fabric</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={captureFabricFromCamera} disabled={loading}>
              <Text style={styles.btnText}>Capture</Text>
            </Pressable>
          </View>

          <View style={styles.previewWrap}>
            {fabricUri ? (
              <Image source={{ uri: fabricUri }} style={styles.preview} resizeMode="cover" />
            ) : (
              <Text style={styles.muted}>No fabric selected</Text>
            )}
          </View>
        </View>

        {/* (b) Hero - middle 40% */}
        <View style={[styles.sectionCard, { flex: 4, marginTop: 12 }]}>
          <Text style={styles.sectionTitle}>2) Hero</Text>

          <Pressable style={styles.btnWide} onPress={openHeroPicker} disabled={loading}>
            <Text style={styles.btnText}>Pick Hero Image</Text>
          </Pressable>

          <View style={styles.previewWrap}>
            {heroUrl ? (
              <Image source={{ uri: heroUrl }} style={styles.preview} resizeMode="cover" />
            ) : (
              <Text style={styles.muted}>No hero selected</Text>
            )}
          </View>
        </View>

        {/* (c) Generate - last 20% */}
        <View style={[styles.sectionCard, { flex: 2, marginTop: 12, justifyContent: "center" }]}>
          <Pressable style={[styles.generateBtn, loading ? { opacity: 0.7 } : null]} onPress={onGenerate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.generateText}>Generate</Text>}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f6f6", paddingHorizontal: 16, paddingBottom: 16 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 6, paddingBottom: 6 },
  headerBtnPad: { paddingVertical: 6, paddingHorizontal: 6 },
  back: { fontWeight: "900" },

  title: { fontSize: 22, fontWeight: "900", marginTop: 8 },
  sub: { marginTop: 4, opacity: 0.7, marginBottom: 12 },

  sectionsWrap: { flex: 1 },

  sectionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
  },

  sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },

  btnRow: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnWide: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "800" },

  previewWrap: {
    flex: 1,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "#f3f3f3",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  preview: { width: "100%", height: "100%" },
  muted: { opacity: 0.6 },

  generateBtn: {
    backgroundColor: "#0a7",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  generateText: { color: "white", fontWeight: "900", fontSize: 16 },
});
