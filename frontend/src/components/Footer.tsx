import { HeartFilled } from "@ant-design/icons";
import { Typography } from "antd";
import { Link, useNavigate } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

import styles from "./Footer.module.css";

const { Text } = Typography;

export default function Footer() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const onLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Text className={styles.tagline}>
          Самара детям — экскурсионное бюро{" "}
          <HeartFilled className={styles.heart} />
        </Text>
        <div className={styles.links}>
          <Link to="/events">Каталог</Link>
          {user ? (
            <>
              <Link to="/profile">Личный кабинет</Link>
              <button type="button" className={styles.footerLinkBtn} onClick={onLogout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/register">Регистрация</Link>
              <Link to="/login">Войти</Link>
            </>
          )}
        </div>
        <Text type="secondary" className={styles.copy}>
          © {new Date().getFullYear()}
        </Text>
      </div>
    </footer>
  );
}
