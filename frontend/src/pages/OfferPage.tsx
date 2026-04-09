import { Typography } from "antd";

import styles from "./LegalDocumentPage.module.css";

const { Title, Paragraph } = Typography;

/** Публичная оферта — текст добавьте позже. */
export default function OfferPage() {
  return (
    <div className={styles.wrap}>
      <Title level={1} className={styles.title}>
        Договор оферты
      </Title>
      <Paragraph type="secondary">
        Здесь будет полный текст договора оферты. Раздел можно заполнить позже.
      </Paragraph>
    </div>
  );
}
