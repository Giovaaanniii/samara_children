import { HeartFilled } from "@ant-design/icons";
import { Typography } from "antd";
import { Link } from "react-router-dom";

import styles from "./Footer.module.css";

const { Text } = Typography;

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Text className={styles.tagline}>
          Самара детям — экскурсионное бюро{" "}
          <HeartFilled className={styles.heart} />
        </Text>
        <div className={styles.links}>
          <Link to="/events">Каталог</Link>
          <Link to="/faq">Вопросы</Link>
          <Link to="/login">Личный кабинет</Link>
        </div>
        <Text type="secondary" className={styles.copy}>
          © {new Date().getFullYear()}
        </Text>
      </div>
    </footer>
  );
}
