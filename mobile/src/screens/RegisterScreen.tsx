import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { register, isLoading } = useAuth();
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (password.length < 8) {
      Alert.alert("Пароль", "Минимум 8 символов.");
      return;
    }
    if (password !== password2) {
      Alert.alert("Пароль", "Пароли не совпадают.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Данные", "Укажите имя и фамилию.");
      return;
    }
    setBusy(true);
    try {
      await register({
        login: login.trim(),
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.replace("Main");
    } catch (e) {
      Alert.alert("Регистрация", getApiErrorDetail(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Регистрация</Text>
        <TextInput
          style={styles.input}
          placeholder="Логин"
          autoCapitalize="none"
          value={login}
          onChangeText={setLogin}
        />
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
          placeholder="Пароль"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Повтор пароля"
          secureTextEntry
          value={password2}
          onChangeText={setPassword2}
        />
        <TextInput
          style={styles.input}
          placeholder="Имя"
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          style={styles.input}
          placeholder="Фамилия"
          value={lastName}
          onChangeText={setLastName}
        />
        <Pressable
          style={[styles.btn, (busy || isLoading) && styles.btnOff]}
          disabled={busy || isLoading}
          onPress={() => void onSubmit()}
        >
          {busy || isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Создать аккаунт</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 16, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
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
});
