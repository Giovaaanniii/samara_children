import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { Link, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../store/authStore";

import styles from "./Header.module.css";

export default function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const onLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const displayName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.first_name || user?.login || "";

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
        </nav>

        <div className={styles.actions}>
          <UserOutlined className={styles.userIcon} aria-hidden />
          {user ? (
            <>
              <span className={styles.userName} title={user.email}>
                {displayName}
              </span>
              <Link to="/profile" className={styles.loginLink}>
                Личный кабинет
              </Link>
              <Button
                type="default"
                className={styles.logoutBtn}
                icon={<LogoutOutlined />}
                onClick={onLogout}
              >
                Выйти
              </Button>
            </>
          ) : (
            <>
              <Link to="/register" className={styles.loginLink}>
                Регистрация
              </Link>
              <Link to="/login" className={styles.loginLink}>
                Войти
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
