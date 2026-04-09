import { Typography } from "antd";

import styles from "./LegalDocumentPage.module.css";

const { Title, Paragraph } = Typography;

/** Политика конфиденциальности — текст добавьте позже. */
export default function PrivacyPage() {
  return (
    <div className={styles.wrap}>
      <Title level={1} className={styles.title}>
        Политика конфиденциальности
      </Title>
      <Paragraph type="secondary">
        Здесь будет политика обработки персональных данных. Раздел можно заполнить
        позже.
      </Paragraph>
    </div>
  );
}
