import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { authShop, getToken, saveSession } from "../lib/api";

export default function LoginScreen() {
  const router = useRouter();

  const [shopCode, setShopCode] = useState("RT001");
  const [pin, setPin] = useState("4827");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const token = await getToken();
        if (mounted && token) router.replace("/home");
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function onLogin() {
    try {
      setLoading(true);

      const data = await authShop(shopCode.trim(), pin.trim());
      await saveSession(data.token, data.shop_id, data.shop_name);

      router.replace("/home");
    } catch (e: any) {
      Alert.alert("Login failed", e?.message || "Please check shop code & PIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Vastra</Text>
      <Text style={styles.subtitle}>Enter Shop Code + PIN</Text>

      <Text style={styles.label}>Shop Code</Text>
      <TextInput
        value={shopCode}
        onChangeText={setShopCode}
        autoCapitalize="characters"
        style={styles.input}
        placeholder="RT001"
      />

      <Text style={styles.label}>PIN</Text>
      <TextInput
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        style={styles.input}
        placeholder="4827"
      />

      <Pressable style={styles.button} onPress={onLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </Pressable>

      <Text style={styles.hint}>
        No OTP in MVP. Use the credentials you created in backend/shops.json
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 16, opacity: 0.7, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    marginTop: 18,
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "700" },
  hint: { marginTop: 14, fontSize: 12, opacity: 0.6 },
});
