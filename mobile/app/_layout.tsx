// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen name="history" />
      <Stack.Screen name="heroes" />

      {/* ✅ New screens for Visualize flow */}
      <Stack.Screen name="visualize" />
      <Stack.Screen name="output" />
      <Stack.Screen name="heroes-pick" />
    </Stack>
  );
}
