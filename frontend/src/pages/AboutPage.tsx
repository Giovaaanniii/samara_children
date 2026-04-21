import {
  CarOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  SafetyOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { Card, Col, Divider, Row, Typography } from "antd";

import styles from "./AboutPage.module.css";

const { Title, Paragraph, Text } = Typography;

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <Text className={styles.heroLabel}>Самара детям</Text>
          <Title level={1} className={styles.heroTitle}>
            О нас
          </Title>
          <Paragraph className={styles.heroText}>
            Экскурсии для школьников в Самаре. Организация мероприятий. Проведение мастер-классов.
          </Paragraph>
        </div>
      </section>

      <Row gutter={[20, 20]}>
        <Col xs={24} md={10}>
          <Card className={styles.imageCard}>
            <img
              src="/logo2.png"
              alt="Изображение компании"
              className={styles.image}
            />
            <Text type="secondary" className={styles.imageHint}>
              Вы можете заменить это изображение на любое своё.
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card>
            <Paragraph strong>
              Экскурсии для школьников в Самаре. Организация мероприятий. Проведение мастер-классов.
            </Paragraph>
            <Paragraph>
              Здравствуйте, дорогие друзья!
            </Paragraph>
            <Paragraph>
              Мы организовали этот проект, чтобы раз и навсегда изменить стандартный подход к детскому досугу в
              нашем городе.
            </Paragraph>
            <Paragraph>
              Привычные экскурсии и стандартные маршруты - это не про нас!
            </Paragraph>
            <Paragraph>
              Мы делаем все для того, чтобы подарить Вашим детям свежие эмоции, яркие переживания и невероятные
              приключения, которые запомнятся на всю жизнь!
            </Paragraph>
          </Card>
        </Col>
      </Row>

      <Card className={styles.card}>
        <Title level={4}>Наши преимущества</Title>
        <div className={styles.advantages}>
          <div className={styles.advItem}>
            <CheckCircleOutlined className={styles.advIcon} />
            <span>гибкий график и индивидуальный подход;</span>
          </div>
          <div className={styles.advItem}>
            <StarOutlined className={styles.advIcon} />
            <span>адекватные цены и эксклюзивные экскурсионные программы;</span>
          </div>
          <div className={styles.advItem}>
            <SafetyOutlined className={styles.advIcon} />
            <span>годовые абонементы и проверенные маршруты;</span>
          </div>
          <div className={styles.advItem}>
            <CarOutlined className={styles.advIcon} />
            <span>комфортабельные автобусы с разрешением в ГИБДД;</span>
          </div>
          <div className={styles.advItem}>
            <CheckCircleOutlined className={styles.advIcon} />
            <span>высококвалифицированные водители и лучшие экскурсоводы.</span>
          </div>
        </div>
      </Card>

      <Card className={styles.card}>
        <Title level={4}>Контактные данные</Title>
        <Divider style={{ marginTop: 0 }} />
        <div className={styles.contacts}>
          <div className={styles.contactRow}>
            <PhoneOutlined className={styles.contactIcon} />
            <span>+79608291455 - Мария Горбунова</span>
          </div>
          <div className={styles.contactRow}>
            <PhoneOutlined className={styles.contactIcon} />
            <span>+79276536636 - Мария Жарова</span>
          </div>
        </div>
        <Text type="secondary">
        </Text>
      </Card>
    </div>
  );
}
