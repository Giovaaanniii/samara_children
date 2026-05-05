import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { authApi } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorDetail } from "../../lib/errors";
import { colors } from "../../theme";

export default function ProfileGuideForm() {
  const { user, setUser } = useAuth();
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLogin(user.login);
    setEmail(user.email);
    setFirstName(user.first_name ?? "");
    setLastName(user.last_name ?? "");
    setPatronymic(user.patronymic ?? "");
    setPhone(user.phone ?? "");
    setPassword("");
    setPassword2("");
  }, [user]);

  if (!user) return null;

  const onSave = async () => {
    if (password && password.length < 8) {
      Alert.alert("Пароль", "Минимум 8 символов");
      return;
    }
    if (password && password !== password2) {
      Alert.alert("Пароль", "Пароли не совпадают");
      return;
    }
    setSaving(true);
    try {
      const { data } = await authApi.updateMe({
        login: login.trim(),
        email: email.trim(),
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        patronymic: patronymic.trim() || null,
        phone: phone.trim() || null,
        ...(password ? { password } : {}),
      });
      setUser(data);
      setPassword("");
      setPassword2("");
      Alert.alert("Профиль", "Изменения сохранены");
    } catch (e) {
      Alert.alert("Ошибка", getApiErrorDetail(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Профиль</Text>
      <Text style={styles.label}>Логин</Text>
      <TextInput style={styles.input} value={login} onChangeText={setLogin} autoCapitalize="none" />
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Text style={styles.label}>Имя</Text>
      <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
      <Text style={styles.label}>Фамилия</Text>
      <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
      <Text style={styles.label}>Отчество</Text>
      <TextInput style={styles.input} value={patronymic} onChangeText={setPatronymic} />
      <Text style={styles.label}>Телефон</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Text style={styles.label}>Новый пароль (необязательно)</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Оставьте пустым, если не меняете"
        placeholderTextColor={colors.muted}
      />
      <Text style={styles.label}>Повтор пароля</Text>
      <TextInput
        style={styles.input}
        value={password2}
        onChangeText={setPassword2}
        secureTextEntry
      />
      <Pressable style={[styles.save, saving && styles.saveOff]} disabled={saving} onPress={() => void onSave()}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveTxt}>Сохранить изменения</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: "800", marginBottom: 12, color: colors.text },
  label: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    color: colors.text,
  },
  save: {
    marginTop: 6,
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveOff: { opacity: 0.6 },
  saveTxt: { color: "#fff", fontWeight: "800" },
});
