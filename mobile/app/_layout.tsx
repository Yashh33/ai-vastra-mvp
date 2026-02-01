// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen name="history" />
      <Stack.Screen name="heroes" />
      {/* Visualize + Output viewer will come later */}
      {/* <Stack.Screen name="visualize" /> */}
      {/* <Stack.Screen name="output" /> */}
    </Stack>
  );
}
