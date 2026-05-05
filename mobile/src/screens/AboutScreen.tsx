import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WEB_BASE_URL } from "../config";
import { colors } from "../theme";

export default function AboutScreen() {
  const openWeb = (path: string) => {
    const base = WEB_BASE_URL;
    if (!base) return;
    void Linking.openURL(`${base}${path}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.hero}>О нас</Text>
        <Text style={styles.p}>
          Экскурсии для школьников в Самаре. Организация мероприятий. Проведение
          мастер-классов.
        </Text>
        <Text style={styles.p}>
          Мы организовали этот проект, чтобы раз и навсегда изменить стандартный
          подход к детскому досугу в нашем городе.
        </Text>

        <Text style={styles.h2}>Наши преимущества</Text>
        <Text style={styles.li}>• гибкий график и индивидуальный подход;</Text>
        <Text style={styles.li}>• адекватные цены и авторские программы;</Text>
        <Text style={styles.li}>• проверенные маршруты и безопасность;</Text>
        <Text style={styles.li}>• комфортабельный транспорт и сильная команда.</Text>

        <Text style={styles.h2}>Контакты</Text>
        <Pressable onPress={() => void Linking.openURL("tel:+79608291455")}>
          <Text style={styles.link}>+7 960 829-14-55</Text>
        </Pressable>

        {WEB_BASE_URL ? (
          <View style={styles.legal}>
            <Pressable onPress={() => openWeb("/offer")}>
              <Text style={styles.link}>Договор оферты (сайт)</Text>
            </Pressable>
            <Pressable onPress={() => openWeb("/privacy")}>
              <Text style={styles.link}>Политика конфиденциальности (сайт)</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.hint}>
            Укажите EXPO_PUBLIC_WEB_BASE_URL в .env, чтобы открывать оферту и
            политику в браузере.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: 12 },
  p: { fontSize: 15, lineHeight: 22, color: colors.text, marginBottom: 10 },
  h2: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 8,
    color: colors.text,
  },
  li: { fontSize: 15, color: colors.muted, marginBottom: 6 },
  link: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
    marginBottom: 8,
  },
  legal: { marginTop: 16, gap: 8 },
  hint: { marginTop: 12, color: colors.muted, fontSize: 13 },
});
