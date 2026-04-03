import { UserOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <div className={styles.logoSlot} title="Загрузите логотип в /src/assets/">
            <span className={styles.logoHint}>логотип</span>
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>Самара</span>
            <span className={styles.brandSub}>детям</span>
          </div>
        </Link>

        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            Главная
          </Link>
          <Link to="/events" className={styles.navLink}>
            Мероприятия
          </Link>
          <Link to="/excursions" className={styles.navLink}>
            Экскурсии
          </Link>
          <Link to="/workshops" className={styles.navLink}>
            Мастер-классы
          </Link>
          <Link to="/faq" className={styles.navLink}>
            FAQ
          </Link>
        </nav>

        <div className={styles.actions}>
          <UserOutlined className={styles.userIcon} aria-hidden />
          <Link to="/login" className={styles.loginLink}>
            Войти
          </Link>
        </div>
      </div>
    </header>
  );
}
