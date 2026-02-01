// app/output.tsx
import React, { useState } from "react";
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
import { router, useLocalSearchParams,type Href } from "expo-router";
import * as FileSystem from "expo-file-system";
// import * as FileSystem from "expo-file-system/FileSystem";
// import * as FileSystem from "expo-file-system/build/FileSystem";
import * as Sharing from "expo-sharing";

export default function OutputScreen() {
  const params = useLocalSearchParams<{
    output_url?: string;
    output_key?: string;
    job_id?: string;
  }>();

  const outputUrl = (params.output_url as string) || "";
  const jobId = (params.job_id as string) || "output";

  const [downloading, setDownloading] = useState(false);

  async function onDownload() {
    if (!outputUrl) {
      Alert.alert("Missing Output", "No output URL found.");
      return;
    }

    try {
      setDownloading(true);

      const filename = `ai-vastra-${jobId}.jpg`;
    //   const dest = `${FileSystem.cacheDirectory}${filename}`;

      const FS = FileSystem as any;

      const baseDir = FS.documentDirectory || FS.cacheDirectory;
       if (!baseDir) throw new Error("No filesystem directory available");
    
    //   const baseDir = FileSystem.documentDirectory;
    //   if (!baseDir) throw new Error("No filesystem directory available");

      const dest = `${baseDir}${filename}`;

      const dl = await FileSystem.downloadAsync(outputUrl, dest);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(dl.uri);
      } else {
        Alert.alert("Downloaded", `Saved to: ${dl.uri}`);
      }
    } catch (e: any) {
      Alert.alert("Download failed", e?.message || "Could not download");
    } finally {
      setDownloading(false);
    }
  }

  function onClose() {
    // Go back to Visualize flow screen (1.1.1)
    router.replace("/visualize" as Href);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.headerBtnPad}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Output</Text>
      <Text style={styles.sub}>Your generated visualization</Text>

      {/* Top 80%: output display */}
      <View style={[styles.outputWrap, { flex: 8 }]}>
        {outputUrl ? (
          <Image source={{ uri: outputUrl }} style={styles.outputImage} resizeMode="contain" />
        ) : (
          <View style={styles.missingWrap}>
            <Text style={styles.muted}>Missing output_url</Text>
          </View>
        )}
      </View>

      {/* Bottom 20%: actions */}
      <View style={[styles.actionsWrap, { flex: 2 }]}>
        <Pressable
          style={[styles.btn, downloading ? { opacity: 0.7 } : null]}
          onPress={onDownload}
          disabled={downloading}
        >
          {downloading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Download</Text>}
        </Pressable>

        <Pressable style={[styles.btn, styles.closeBtn]} onPress={onClose}>
          <Text style={styles.btnText}>Close</Text>
        </Pressable>
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

  outputWrap: {
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

  actionsWrap: {
    marginTop: 12,
    gap: 10,
    justifyContent: "center",
  },
  btn: {
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  closeBtn: {
    backgroundColor: "#0a7",
  },
  btnText: { color: "white", fontWeight: "900", fontSize: 16 },
});


