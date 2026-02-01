// app/home.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from "react-native";
import { router, type Href } from "expo-router";
import { clearSession, me } from "../lib/api";

export default function Home() {
  const [shopId, setShopId] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await me();
        setShopId(res.shop_id);
      } catch {
        Alert.alert("Session expired", "Please login again.");
        router.replace("/");
      }
    })();
  }, []);

  async function logout() {
    await clearSession();
    router.replace("/");
  }

  return (
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

      <Pressable
        style={styles.tile}
        onPress={() => Alert.alert("Next", "Visualize screen comes next (1.1).")}
      >
        <Text style={styles.tileTitle}>Visualize</Text>
        <Text style={styles.tileSub}>Create a new outfit visualization</Text>
      </Pressable>

      <Pressable style={styles.tile} onPress={() => router.push("/history" as Href)}>
        <Text style={styles.tileTitle}>Output History</Text>
        <Text style={styles.tileSub}>View & download previous outputs</Text>
      </Pressable>

      <Pressable style={styles.tile} onPress={() => router.push("/heroes" as Href)}>
        <Text style={styles.tileTitle}>Hero Image Collection</Text>
        <Text style={styles.tileSub}>Upload & manage hero model images</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  title: { fontSize: 26, fontWeight: "800" },
  sub: { marginTop: 2, opacity: 0.7 },

  logoutBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#eee" },
  logoutText: { fontWeight: "700" },

  tile: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  tileTitle: { fontSize: 18, fontWeight: "900" },
  tileSub: { marginTop: 6, opacity: 0.7 },
});
