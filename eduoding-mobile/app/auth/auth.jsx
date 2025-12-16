// eduoding-mobile/app/auth.jsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";


export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      return setMsg("Email & password required");
    }

    try {
      setLoading(true);

      if (isLogin) {
        const res = await API.post("/auth/login", {
          email: email.toLowerCase().trim(),
          password,
        });

        await AsyncStorage.setItem("authToken", res.data.token);
        router.replace("/(tabs)");
      } else {
        await API.post("/auth/register", {
          username,
          email: email.toLowerCase().trim(),
          password,
        });

        Alert.alert("OTP Sent", "Check your email for OTP");
      }
    } catch (err) {
      setMsg(err.response?.data?.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrapper}>
      <View style={styles.card}>
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
        />

        <Text style={styles.title}>
          {isLogin ? "Login" : "Sign Up"}
        </Text>

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}

        <Pressable
          style={styles.primaryBtn}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>
            {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
          </Text>
        </Pressable>

        <Pressable onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchText}>
            {isLogin
              ? "Don't have an account? Sign Up"
              : "Already have an account? Login"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 1,
    backgroundColor: "#f2f4ff",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    elevation: 6,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    color: "#222",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: "#6c63ff",
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  primaryBtnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 15,
  },
  switchText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 13,
    color: "#555",
  },
  msg: {
    color: "#e74c3c",
    textAlign: "center",
    marginVertical: 8,
  },
});
