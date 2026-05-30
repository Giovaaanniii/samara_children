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

const COMPANY_NAME =
  'ООО «САМАРСКОЕ ЭКСКУРСИОННОЕ БЮРО «САМАРА ДЕТЯМ»»';
const COMPANY_INN = '6318044674';
const COMPANY_OGRN = '1196313024390';
const COMPANY_ADDRESS =
  '443022, Самарская область, г. Самара, ш. Заводское, д. 13Б, этаж 4, офис 405';
const COMPANY_EMAIL = 'samaradetyam@mail.ru';

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
        <Title level={4}>Реквизиты</Title>
        <Divider style={{ marginTop: 0 }} />
        <div className={styles.requisites}>
          <Paragraph className={styles.requisiteRow}>
            <Text strong>Наименование: </Text>
            {COMPANY_NAME}
          </Paragraph>
          <Paragraph className={styles.requisiteRow}>
            <Text strong>ИНН: </Text>
            {COMPANY_INN}
          </Paragraph>
          <Paragraph className={styles.requisiteRow}>
            <Text strong>ОГРН: </Text>
            {COMPANY_OGRN}
          </Paragraph>
          <Paragraph className={styles.requisiteRow}>
            <Text strong>Юридический адрес: </Text>
            {COMPANY_ADDRESS}
          </Paragraph>
          <Paragraph className={styles.requisiteRow}>
            <Text strong>E-mail: </Text>
            <a href={`mailto:${COMPANY_EMAIL}`} className={styles.contactPhone}>
              {COMPANY_EMAIL}
            </a>
          </Paragraph>
        </div>
      </Card>

      <Card className={styles.card}>
        <Title level={4}>Контактные данные</Title>
        <Divider style={{ marginTop: 0 }} />
        <div className={styles.contacts}>
          <div className={styles.contactRow}>
            <PhoneOutlined className={styles.contactIcon} />
            <span>
              <a href="tel:+79608291455" className={styles.contactPhone}>
                +7 960 829-14-55
              </a>
              <Text type="secondary" className={styles.contactName}>
                Мария Горбунова
              </Text>
            </span>
          </div>
          <div className={styles.contactRow}>
            <PhoneOutlined className={styles.contactIcon} />
            <span>
              <a href="tel:+79276536636" className={styles.contactPhone}>
                +7 927 653-66-36
              </a>
              <Text type="secondary" className={styles.contactName}>
                Мария Жарова
              </Text>
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

