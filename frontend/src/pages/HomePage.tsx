import {
  CompassOutlined,
  HeartOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Col, Input, Row, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import BrandLogo from "../components/BrandLogo";
import { EventCard } from "../components/EventCard";
import { eventsApi } from "../services/eventsApi";
import type { EventRecord } from "../types";

import styles from "./HomePage.module.css";

const { Title, Paragraph, Text } = Typography;

export default function HomePage() {
  const navigate = useNavigate();
  const [popular, setPopular] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await eventsApi.list({ limit: 6, status: "active" });
        if (!cancelled) setPopular(data.items);
      } catch {
        if (!cancelled) setPopular([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSearch = () => {
    const q = search.trim();
    if (q) navigate(`/events?q=${encodeURIComponent(q)}`);
    else navigate("/events");
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <h1 className={styles.heroTitle}>
              Экскурсии и мероприятия для детей в Самаре
            </h1>
            <p className={styles.heroSubtitle}>
              Авторские программы для школьников и семей: экскурсии, квесты и
              мастер-классы — яркие впечатления и безопасный досуг.
            </p>
          </div>
          <div className={styles.heroLogo}>
            <BrandLogo
              className={styles.heroLogoImg}
              alt="Самара детям"
              pngSrc="/logo2.png"
              fallbackSrc="/logo.png"
            />
          </div>
        </div>
      </section>

      <div className={styles.searchSection}>
        <div className={styles.searchBar}>
          <Input.Search
            size="large"
            placeholder="Поиск по названию мероприятия…"
            allowClear
            enterButton="Найти"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={onSearch}
          />
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <Title level={2} className={styles.sectionTitle}>
            Популярные сейчас
          </Title>
          <Link to="/events">
            <Button type="link" className={styles.sectionLink}>
              Весь каталог →
            </Button>
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Row gutter={[20, 20]}>
            {popular.length === 0 ? (
              <Col span={24}>
                <Paragraph type="secondary">
                  Пока нет мероприятий в каталоге — загляните позже.
                </Paragraph>
              </Col>
            ) : (
              popular.map((ev) => (
                <Col xs={24} sm={12} lg={8} key={ev.id}>
                  <EventCard event={ev} />
                </Col>
              ))
            )}
          </Row>
        )}

        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <CompassOutlined style={{ color: "#b83232" }} />
            </div>
            <Text strong>Проверенные маршруты</Text>
            <p className={styles.featureText}>
              Работаем с гидами и площадками, которые знают детскую аудиторию.
            </p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <TeamOutlined style={{ color: "#b83232" }} />
            </div>
            <Text strong>Классы и группы</Text>
            <p className={styles.featureText}>
              Организуем выезды для школ, кружков и семейных компаний.
            </p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <HeartOutlined style={{ color: "#b83232" }} />
            </div>
            <Text strong>Бережно о детях</Text>
            <p className={styles.featureText}>
              Прозрачное бронирование и сопровождение на каждом этапе.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
