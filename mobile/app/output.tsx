// app/output.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  LayoutChangeEvent,
  GestureResponderEvent,
} from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { adjustOutputColors, analyzeOutputColors } from "../lib/api";

type ProminentColor = {
  id: string;
  hex: string;
  coverage: number;
  h: number;
  s: number;
  l: number;
};

type SliderRowProps = {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (next: number) => void;
};

function SliderRow({ label, min, max, value, onChange }: SliderRowProps) {
  const [trackWidth, setTrackWidth] = useState(1);

  function setFromLocation(e: GestureResponderEvent) {
    const x = Math.max(0, Math.min(trackWidth, e.nativeEvent.locationX));
    const ratio = x / trackWidth;
    const next = Math.round(min + ratio * (max - min));
    onChange(next);
  }

  function onTrackLayout(e: LayoutChangeEvent) {
    setTrackWidth(Math.max(1, e.nativeEvent.layout.width));
  }

  const ratio = (value - min) / (max - min);

  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeaderRow}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{value}</Text>
      </View>

      <View style={styles.sliderControlRow}>
        <Pressable style={styles.adjustBtn} onPress={() => onChange(Math.max(min, value - 1))}>
          <Text style={styles.adjustBtnText}>−</Text>
        </Pressable>

        <Pressable style={styles.trackWrap} onLayout={onTrackLayout} onPress={setFromLocation}>
          <View style={styles.track} />
          <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, ratio * 100))}%` }]} />
          <View style={[styles.knob, { left: `${Math.max(0, Math.min(100, ratio * 100))}%` }]} />
        </Pressable>

        <Pressable style={styles.adjustBtn} onPress={() => onChange(Math.min(max, value + 1))}>
          <Text style={styles.adjustBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function OutputScreen() {
  const params = useLocalSearchParams<{
    output_url?: string;
    output_key?: string;
    job_id?: string;
  }>();

  const outputUrl = (params.output_url as string) || "";
  const outputKey = (params.output_key as string) || "";
  const jobId = (params.job_id as string) || "output";

  const [downloading, setDownloading] = useState(false);
  const [loadingColors, setLoadingColors] = useState(false);
  const [applying, setApplying] = useState(false);

  const [prominentColors, setProminentColors] = useState<ProminentColor[]>([]);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(0);

  const [currentOutputUrl, setCurrentOutputUrl] = useState(outputUrl);
  const [currentOutputKey, setCurrentOutputKey] = useState(outputKey);

  const selectedColor = useMemo(
    () => prominentColors.find((c) => c.id === selectedColorId) || null,
    [prominentColors, selectedColorId]
  );

  const FS: any = FileSystem;

  useEffect(() => {
    setCurrentOutputUrl(outputUrl);
    setCurrentOutputKey(outputKey);
  }, [outputUrl, outputKey]);

  useEffect(() => {
    let mounted = true;

    async function loadProminentColors() {
      if (!currentOutputKey) return;
      try {
        setLoadingColors(true);
        const res = await analyzeOutputColors(currentOutputKey, 6);
        if (!mounted) return;

        const colors = res.colors || [];
        setProminentColors(colors);
        setSelectedColorId(colors[0]?.id || null);
      } catch (e: any) {
        if (mounted) {
          Alert.alert("Color analysis failed", e?.message || "Could not analyze prominent colors.");
        }
      } finally {
        if (mounted) setLoadingColors(false);
      }
    }

    loadProminentColors();

    return () => {
      mounted = false;
    };
  }, [currentOutputKey]);

  async function saveImageToGallery(imageUrl: string, filename: string) {
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (!perm.granted) {
      throw new Error("Photo permission not granted");
    }

    const baseDir = FS.documentDirectory || FS.cacheDirectory;
    if (!baseDir) throw new Error("No filesystem directory available");

    const localUri = `${baseDir}${filename}`;
    const dl = await FS.downloadAsync(imageUrl, localUri);
    await MediaLibrary.saveToLibraryAsync(dl.uri);

    return dl.uri;
  }

  async function onDownload() {
    if (!currentOutputUrl) {
      Alert.alert("Missing Output", "No output URL found.");
      return;
    }

    try {
      setDownloading(true);
      await saveImageToGallery(currentOutputUrl, `ai-vastra-${jobId || "output"}.jpg`);
      Alert.alert("Saved ✅", "Image saved to your Gallery/Photos.");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Could not save image");
    } finally {
      setDownloading(false);
    }
  }

  async function onApplyAdjustments() {
    if (!currentOutputKey) {
      Alert.alert("Missing image", "No output key found for adjustment.");
      return;
    }

    try {
      setApplying(true);
      const adjusted = await adjustOutputColors({
        image_key: currentOutputKey,
        target_h: selectedColor ? selectedColor.h : null,
        hue_delta: hue,
        sat_delta: saturation,
        light_delta: lightness,
        tolerance: 28,
        feather: 12,
      });

      setCurrentOutputKey(adjusted.adjusted_key);
      setCurrentOutputUrl(adjusted.adjusted_url);
      Alert.alert("Updated", "Color adjustment applied to output.");
    } catch (e: any) {
      Alert.alert("Adjustment failed", e?.message || "Could not adjust colors.");
    } finally {
      setApplying(false);
    }
  }

  function onReset() {
    setHue(0);
    setSaturation(0);
    setLightness(0);
  }

  function onClose() {
    router.replace("/visualize" as Href);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.headerBtnPad}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Output</Text>
        <Text style={styles.sub}>Adjust final output colors using prominent swatches + H/S/L.</Text>

        <View style={styles.outputWrap}>
          {currentOutputUrl ? (
            <Image source={{ uri: currentOutputUrl }} style={styles.outputImage} resizeMode="contain" />
          ) : (
            <View style={styles.missingWrap}>
              <Text style={styles.muted}>Missing output_url</Text>
            </View>
          )}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeaderRow}>
            <Text style={styles.panelTitle}>Prominent Colors</Text>
            {loadingColors ? <ActivityIndicator size="small" /> : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatchRow}>
            {prominentColors.map((color) => {
              const active = selectedColorId === color.id;
              return (
                <Pressable
                  key={color.id}
                  onPress={() => setSelectedColorId(color.id)}
                  style={[styles.swatchWrap, active ? styles.swatchActive : null]}
                >
                  <View style={[styles.swatch, { backgroundColor: color.hex }]} />
                  <Text style={styles.swatchCoverage}>{Math.round(color.coverage * 100)}%</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <SliderRow label="Hue" min={-180} max={180} value={hue} onChange={setHue} />
          <SliderRow label="Saturation" min={-100} max={100} value={saturation} onChange={setSaturation} />
          <SliderRow label="Lightness" min={-100} max={100} value={lightness} onChange={setLightness} />

          <View style={styles.rowActions}>
            <Pressable style={styles.resetBtn} onPress={onReset}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </Pressable>

            <Pressable
              style={[styles.applyBtn, applying ? { opacity: 0.7 } : null]}
              onPress={onApplyAdjustments}
              disabled={applying}
            >
              {applying ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyBtnText}>Apply</Text>}
            </Pressable>
          </View>
        </View>

        <View style={styles.actionsWrap}>
          <Pressable style={[styles.btn, downloading ? { opacity: 0.7 } : null]} onPress={onDownload} disabled={downloading}>
            {downloading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Download</Text>}
          </Pressable>

          <Pressable style={[styles.btn, styles.closeBtn]} onPress={onClose}>
            <Text style={styles.btnText}>Close</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f6f6" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 6, paddingBottom: 6 },
  headerBtnPad: { paddingVertical: 6, paddingHorizontal: 6 },
  back: { fontWeight: "900" },

  title: { fontSize: 22, fontWeight: "900", marginTop: 8 },
  sub: { marginTop: 4, opacity: 0.7, marginBottom: 12 },

  outputWrap: {
    height: 330,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  outputImage: { width: "100%", height: "100%" },

  missingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  muted: { opacity: 0.6 },

  panel: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
  },
  panelHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  panelTitle: { fontSize: 15, fontWeight: "900" },

  swatchRow: { gap: 10, paddingVertical: 10 },
  swatchWrap: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 6,
  },
  swatchActive: { borderColor: "#111", borderWidth: 2 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "#ccc" },
  swatchCoverage: { marginTop: 4, fontSize: 10, opacity: 0.7 },

  sliderBlock: { marginTop: 8 },
  sliderHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  sliderLabel: { fontWeight: "700" },
  sliderValue: { fontWeight: "800" },
  sliderControlRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  adjustBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#efefef",
    alignItems: "center",
    justifyContent: "center",
  },
  adjustBtnText: { fontSize: 20, fontWeight: "700" },
  trackWrap: { flex: 1, height: 24, justifyContent: "center" },
  track: { position: "absolute", left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: "#ddd" },
  fill: { position: "absolute", left: 0, height: 6, borderRadius: 3, backgroundColor: "#0a7" },
  knob: {
    position: "absolute",
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#111",
    top: 4,
  },

  rowActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  resetBtn: {
    flex: 1,
    backgroundColor: "#eee",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  resetBtnText: { fontWeight: "800" },
  applyBtn: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  applyBtnText: { color: "#fff", fontWeight: "900" },

  actionsWrap: { marginTop: 12, gap: 10 },
  btn: {
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  closeBtn: { backgroundColor: "#0a7" },
  btnText: { color: "white", fontWeight: "900", fontSize: 16 },
});
