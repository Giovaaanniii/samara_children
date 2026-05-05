import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { getApiErrorDetail } from "../lib/errors";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "Login">;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { login, isLoading } = useAuth();
  const [loginStr, setLoginStr] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!loginStr.trim() || !password) {
      Alert.alert("Вход", "Введите логин и пароль.");
      return;
    }
    setBusy(true);
    try {
      await login(loginStr.trim(), password);
      const p = route.params;
      if (p?.returnTo === "Booking" && p.scheduleId != null) {
        navigation.replace("Booking", { scheduleId: p.scheduleId });
        return;
      }
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.replace("Main");
    } catch (e) {
      Alert.alert("Вход", getApiErrorDetail(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <View style={styles.box}>
        <Text style={styles.title}>Вход</Text>
        <TextInput
          style={styles.input}
          placeholder="Логин или email"
          autoCapitalize="none"
          value={loginStr}
          onChangeText={setLoginStr}
        />
        <TextInput
          style={styles.input}
          placeholder="Пароль"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Pressable
          style={[styles.btn, (busy || isLoading) && styles.btnOff]}
          disabled={busy || isLoading}
          onPress={() => void onSubmit()}
        >
          {busy || isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Войти</Text>
          )}
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Register")}>
          <Text style={styles.link}>Регистрация</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  box: { padding: 20 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 20, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
  btn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnOff: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  link: {
    marginTop: 20,
    textAlign: "center",
    color: colors.primary,
    fontWeight: "600",
  },
});
