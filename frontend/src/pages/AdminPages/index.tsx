import {
  BarChartOutlined,
  CalendarOutlined,
  CommentOutlined,
  ProfileOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Grid, Layout, Menu, Select, Typography } from "antd";
import { useMemo } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import AdminBookingsPage from "./AdminBookingsPage";
import AdminEventsCreatePage from "./AdminEventsCreatePage";
import AdminEventsPage from "./AdminEventsPage";
import AdminGuidesPage from "./AdminGuidesPage";
import AdminPopularNowPage from "./AdminPopularNowPage";
import AdminReportsPage from "./AdminReportsPage";
import AdminReviewsPage from "./AdminReviewsPage";
import AdminSchedulesPage from "./AdminSchedulesPage";

const { Sider, Content } = Layout;
const { Title } = Typography;

export default function AdminPages() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const adminPrefixes = [
    "/admin/events/create",
    "/admin/events",
    "/admin/popular-now",
    "/admin/schedules",
    "/admin/guides",
    "/admin/bookings",
    "/admin/reports",
    "/admin/reviews",
  ];
  const selected =
    adminPrefixes.find((k) => pathname === k || pathname.startsWith(`${k}/`)) ||
    "/admin/events";

  const sections = useMemo(
    () => [
      { key: "/admin/events", icon: <ProfileOutlined />, label: "Мероприятия" },
      { key: "/admin/events/create", icon: <ProfileOutlined />, label: "Создать мероприятие" },
      { key: "/admin/popular-now", icon: <ProfileOutlined />, label: "Популярные сейчас" },
      { key: "/admin/schedules", icon: <CalendarOutlined />, label: "Расписание" },
      { key: "/admin/guides", icon: <TeamOutlined />, label: "Гиды" },
      { key: "/admin/bookings", icon: <ProfileOutlined />, label: "Бронирования" },
      { key: "/admin/reports", icon: <BarChartOutlined />, label: "Отчёты" },
      { key: "/admin/reviews", icon: <CommentOutlined />, label: "Отзывы" },
    ],
    [],
  );

  const menuItems = useMemo(
    () =>
      sections.map((s) => ({
        key: s.key,
        icon: s.icon,
        label: <Link to={s.key}>{s.label}</Link>,
      })),
    [sections],
  );

  const sidebarMenu = (
    <>
      <div style={{ padding: "16px 16px 0" }}>
        <Title level={5}>Админ-панель</Title>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selected]}
        items={menuItems}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: "calc(100vh - 160px)" }}>
      {!isMobile ? (
        <Sider width={260} theme="light">
          {sidebarMenu}
        </Sider>
      ) : null}

      <Content style={{ padding: isMobile ? 12 : 20 }}>
        {isMobile ? (
          <div style={{ marginBottom: 12 }}>
            <Select
              value={selected}
              style={{ width: "100%" }}
              onChange={(value) => navigate(value)}
              options={sections.map((s) => ({ value: s.key, label: s.label }))}
            />
          </div>
        ) : null}
        <Routes>
          <Route path="" element={<Navigate to="events" replace />} />
          <Route path="events" element={<AdminEventsPage />} />
          <Route path="events/create" element={<AdminEventsCreatePage />} />
          <Route path="popular-now" element={<AdminPopularNowPage />} />
          <Route path="schedules" element={<AdminSchedulesPage />} />
          <Route path="guides" element={<AdminGuidesPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
        </Routes>
      </Content>
    </Layout>
  );
}
