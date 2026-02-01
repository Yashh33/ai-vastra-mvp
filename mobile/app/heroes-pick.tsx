// app/heroes-pick.tsx
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
  FlatList,
  useWindowDimensions,
} from "react-native";
import { router, type Href } from "expo-router";
import { getHeroes } from "../lib/api";

type HeroItem = {
  key: string;
  url: string;
  created_at?: string;
  size_bytes?: number;
};

export default function HeroesPickScreen() {
  const [loading, setLoading] = useState(false);
  const [heroes, setHeroes] = useState<HeroItem[]>([]);
  const [selected, setSelected] = useState<HeroItem | null>(null);

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

  function onNext() {
    if (!selected) {
      Alert.alert("Select a Hero", "Please tap one hero image to select it.");
      return;
    }

    // Replace this picker screen with Visualize screen and pass params
    router.replace({
      pathname: "/visualize",
      params: { hero_key: selected.key, hero_url: selected.url },
    }as unknown as Href);
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
            <Pressable onPress={onNext} style={styles.headerBtnPad}>
              <Text style={[styles.next, !selected ? { opacity: 0.4 } : null]}>Next</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.title}>Pick Hero Image</Text>
        <Text style={styles.sub}>Tap one image, then press Next.</Text>

        {loading ? (
          <View style={{ marginTop: 10, marginBottom: 6 }}>
            <ActivityIndicator />
          </View>
        ) : null}
      </View>
    );
  }

  function renderItem({ item }: { item: HeroItem }) {
    const isSelected = selected?.key === item.key;

    return (
      <View style={[styles.tileWrap, { width: tileSize, marginBottom: GAP }]}>
        <Pressable
          onPress={() => setSelected(item)}
          style={[
            styles.tile,
            { width: tileSize, height: tileSize },
            isSelected ? styles.selectedTile : null,
          ]}
        >
          <Image source={{ uri: item.url }} style={styles.tileImage} resizeMode="cover" />
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={heroes}
        keyExtractor={(item) => item.key}
        numColumns={numCols}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={{ gap: GAP }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loading ? null : <Text style={styles.muted}>No hero images found. Add some in Hero Image Collection.</Text>
        }
        renderItem={renderItem}
      />
    </SafeAreaView>
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
  next: { fontWeight: "900", color: "#111" },

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

  selectedTile: {
    borderColor: "#0a7",
    borderWidth: 3,
  },
});
