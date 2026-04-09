import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";

import BrandLogo from "../BrandLogo";
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
          <div className={styles.logoSlot}>
            <BrandLogo className={styles.logoImg} alt="" width={52} height={52} />
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
          {user?.role === "admin" ? (
            <Link to="/admin/events" className={styles.navLink}>
              Админка
            </Link>
          ) : null}
        </nav>

        <div className={styles.actions}>
          <UserOutlined className={styles.userIcon} aria-hidden />
          {user ? (
            <>
              <span className={styles.userName} title={user.email}>
                {displayName}
              </span>
              <Link to="/profile" className={styles.headerAction}>
                Личный кабинет
              </Link>
              <button type="button" className={styles.headerAction} onClick={onLogout}>
                <LogoutOutlined aria-hidden />
                Выйти
              </button>
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
