import {
  LogoutOutlined,
  MenuOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Drawer, Divider } from "antd";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import BrandLogo from "../BrandLogo";
import { useAuthStore } from "../../store/authStore";

import styles from "./Header.module.css";

export default function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const displayName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.first_name || user?.login || "";

  const navLinks = useMemo(
    () => (
      <>
        <Link to="/" className={styles.navLink} onClick={() => setMobileOpen(false)}>
          Главная
        </Link>
        <Link to="/events" className={styles.navLink} onClick={() => setMobileOpen(false)}>
          Мероприятия
        </Link>
        <Link to="/about" className={styles.navLink} onClick={() => setMobileOpen(false)}>
          О нас
        </Link>
        {user?.role === "admin" ? (
          <Link to="/admin/events" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            Админка
          </Link>
        ) : null}
      </>
    ),
    [user?.role],
  );

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Button
          type="text"
          className={styles.burger}
          icon={<MenuOutlined />}
          aria-label="Открыть меню"
          onClick={() => setMobileOpen(true)}
        />

        <Link to="/" className={styles.brand}>
          <div className={styles.logoSlot}>
            <BrandLogo className={styles.logoImg} alt="" width={52} height={52} />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>Самара</span>
            <span className={styles.brandSub}>детям</span>
          </div>
        </Link>

        <nav className={styles.nav}>{navLinks}</nav>

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

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        placement="left"
        width={320}
        title="Меню"
      >
        <div className={styles.mobileNav}>{navLinks}</div>
        <Divider />
        {user ? (
          <div className={styles.mobileActions}>
            <Link to="/profile" className={styles.mobileActionBtn} onClick={() => setMobileOpen(false)}>
              Личный кабинет
            </Link>
            <button
              type="button"
              className={styles.mobileActionBtn}
              onClick={() => {
                setMobileOpen(false);
                onLogout();
              }}
            >
              <LogoutOutlined aria-hidden /> Выйти
            </button>
          </div>
        ) : (
          <div className={styles.mobileActions}>
            <Link to="/register" className={styles.mobileActionBtn} onClick={() => setMobileOpen(false)}>
              Регистрация
            </Link>
            <Link to="/login" className={styles.mobileActionBtn} onClick={() => setMobileOpen(false)}>
              Войти
            </Link>
          </div>
        )}
      </Drawer>
    </header>
  );
}
