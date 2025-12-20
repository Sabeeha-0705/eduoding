// eduoding-mobile/app/_layout.jsx

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "../hooks/use-color-scheme";
import { AuthProvider } from "../context/AuthContext";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider
        value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
      >
        <Stack screenOptions={{ headerShown: false }}>
          {/* 🔐 Auth screen */}
          <Stack.Screen name="auth/auth" />

          {/* 🏠 Main app tabs */}
          <Stack.Screen name="(tabs)" />

          {/* Course routes */}
          <Stack.Screen name="course/[id]" />
          <Stack.Screen name="course/[courseId]/lesson/[lessonId]" />
          <Stack.Screen name="course/[courseId]/quiz" />

          {/* Code routes */}
          <Stack.Screen name="code/editor" />
          <Stack.Screen name="code/mine/all" />
          <Stack.Screen name="code/[id]" />

          {/* User pages */}
          <Stack.Screen name="settings" />
          <Stack.Screen name="notes" />
          <Stack.Screen name="certificates" />
          <Stack.Screen name="leaderboard" />
          <Stack.Screen name="badges" />

          {/* Uploader routes */}
          <Stack.Screen name="uploader/upload" />
          <Stack.Screen name="uploader/dashboard" />

          {/* Admin routes */}
          <Stack.Screen name="admin/requests" />
          <Stack.Screen name="admin/videos" />
          <Stack.Screen name="add-lesson" />

          {/* Optional modal */}
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>

        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
