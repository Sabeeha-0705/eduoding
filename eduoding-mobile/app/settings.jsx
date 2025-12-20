// eduoding-mobile/app/settings.jsx - Settings
import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
// Note: expo-image-picker needs to be installed: npx expo install expo-image-picker
// import * as ImagePicker from "expo-image-picker";
import API from "./services/api";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState("light");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await API.get("/auth/profile");
        if (!mounted) return;
        const u = res.data.user || res.data;
        setUser(u);
        setUsername(u.username || "");
        setName(u.name || "");
        setAvatarPreview(u.avatarUrl || u.avatar || "");
      } catch (err) {
        console.error("Load profile error:", err);
        setError(err?.response?.data?.message || "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const showToast = (text, ms = 2500) => {
    setMsg(text);
    setTimeout(() => setMsg(""), ms);
  };

  const saveProfile = async () => {
    setError("");
    const trimmedUsername = username.trim();
    const trimmedName = name.trim();

    if (trimmedUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    setSaving(true);
    try {
      const res = await API.patch("/auth/profile", {
        username: trimmedUsername,
        name: trimmedName,
        theme,
      });

      const refetch = await API.get("/auth/profile");
      const freshUser = refetch.data.user || refetch.data || {};

      setUser(freshUser);
      setUsername(freshUser.username || trimmedUsername);
      setName(typeof freshUser.name !== "undefined" ? freshUser.name : trimmedName);

      const serverMsg = res.data?.message || "Profile saved!";
      showToast(serverMsg);
    } catch (err) {
      console.error("Save profile error:", err);
      setError(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    // TODO: Install expo-image-picker: npx expo install expo-image-picker
    // For now, showing alert - implement image picker after installing package
    Alert.alert("Coming Soon", "Image picker will be available after installing expo-image-picker");
  };

  const uploadAvatar = async (asset) => {
    setUploadingAvatar(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("avatar", {
        uri: asset.uri,
        type: asset.type || "image/jpeg",
        name: asset.fileName || "avatar.jpg",
      });

      const res = await API.post("/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = res.data || {};
      const updatedUser = data.user || data;
      setUser(updatedUser);

      const newAvatar =
        data.avatarUrl ||
        (data.user && data.user.avatarUrl) ||
        updatedUser.avatarUrl ||
        asset.uri;
      setAvatarPreview(newAvatar);

      showToast("Avatar uploaded!");
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setError(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCancelAvatar = () => {
    setAvatarPreview(user?.avatarUrl || user?.avatar || "");
    setError("");
  };

  const changed =
    user &&
    (username.trim() !== (user.username || "").trim() || name.trim() !== (user.name || "").trim());

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Avatar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avatar</Text>
          <View style={styles.avatarRow}>
            <View style={styles.avatarPreview}>
              {avatarPreview ? (
                <Image source={{ uri: avatarPreview }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarEmpty}>
                  <Text style={styles.avatarEmptyText}>No avatar</Text>
                </View>
              )}
            </View>

            <View style={styles.avatarControls}>
              <Pressable
                style={styles.avatarBtn}
                onPress={pickImage}
                disabled={uploadingAvatar}
              >
                <Text style={styles.avatarBtnText}>Choose Image</Text>
              </Pressable>
              {avatarPreview !== (user?.avatarUrl || user?.avatar || "") && (
                <Pressable
                  style={[styles.avatarBtn, styles.avatarBtnSecondary]}
                  onPress={handleCancelAvatar}
                  disabled={uploadingAvatar}
                >
                  <Text style={styles.avatarBtnTextSecondary}>Cancel</Text>
                </Pressable>
              )}
              <Text style={styles.hint}>Use PNG/JPG. Max 5MB.</Text>
            </View>
          </View>
        </View>

        {/* Theme */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.themeRow}>
            <Pressable
              style={[styles.themeBtn, theme === "light" && styles.themeBtnActive]}
              onPress={() => setTheme("light")}
            >
              <Text style={[styles.themeBtnText, theme === "light" && styles.themeBtnTextActive]}>
                Light
              </Text>
            </Pressable>
            <Pressable
              style={[styles.themeBtn, theme === "dark" && styles.themeBtnActive]}
              onPress={() => setTheme("dark")}
            >
              <Text style={[styles.themeBtnText, theme === "dark" && styles.themeBtnTextActive]}>
                Dark
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.form}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
            />

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Name"
            />

            <View style={styles.formActions}>
              <Pressable
                style={[styles.saveBtn, (!changed || saving) && styles.saveBtnDisabled]}
                onPress={saveProfile}
                disabled={!changed || saving}
              >
                <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
              </Pressable>
              <Pressable
                style={styles.resetBtn}
                onPress={() => {
                  setUsername(user.username || "");
                  setName(user.name || "");
                  setError("");
                }}
                disabled={saving}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </Pressable>
            </View>

            {msg ? <Text style={styles.successMsg}>{msg}</Text> : null}
            {error ? <Text style={styles.errorMsg}>{error}</Text> : null}
          </View>

          <View style={styles.meta}>
            <Text style={styles.metaText}>
              Email: <Text style={styles.metaBold}>{user?.email || "—"}</Text>
            </Text>
            <Text style={styles.metaText}>
              Role: <Text style={styles.metaBold}>{user?.role || "user"}</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: "row",
    gap: 16,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarEmpty: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEmptyText: {
    fontSize: 12,
    color: "#999",
  },
  avatarControls: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  avatarBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
    alignItems: "center",
  },
  avatarBtnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  avatarBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  avatarBtnTextSecondary: {
    color: "#333",
  },
  hint: {
    fontSize: 12,
    color: "#666",
  },
  themeRow: {
    flexDirection: "row",
    gap: 12,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  themeBtnActive: {
    backgroundColor: "#6c63ff",
    borderColor: "#6c63ff",
  },
  themeBtnText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  themeBtnTextActive: {
    color: "#fff",
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    alignItems: "center",
  },
  resetBtnText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  successMsg: {
    color: "#4caf50",
    fontSize: 14,
    marginTop: 8,
  },
  errorMsg: {
    color: "#ff4d4f",
    fontSize: 14,
    marginTop: 8,
  },
  meta: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: "#666",
  },
  metaBold: {
    fontWeight: "700",
    color: "#333",
  },
});

