import { BarChartOutlined, CalendarOutlined, ProfileOutlined, TeamOutlined } from "@ant-design/icons";
import { Layout, Menu, Typography } from "antd";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";

import AdminBookingsPage from "./AdminBookingsPage";
import AdminEventsCreatePage from "./AdminEventsCreatePage";
import AdminEventsPage from "./AdminEventsPage";
import AdminGuidesPage from "./AdminGuidesPage";
import AdminReportsPage from "./AdminReportsPage";
import AdminSchedulesPage from "./AdminSchedulesPage";

const { Sider, Content } = Layout;
const { Title } = Typography;

export default function AdminPages() {
  const { pathname } = useLocation();
  const adminPrefixes = [
    "/admin/events/create",
    "/admin/events",
    "/admin/schedules",
    "/admin/guides",
    "/admin/bookings",
    "/admin/reports",
  ];
  const selected =
    adminPrefixes.find((k) => pathname === k || pathname.startsWith(`${k}/`)) ||
    "/admin/events";

  return (
    <Layout style={{ minHeight: "calc(100vh - 160px)" }}>
      <Sider width={260} theme="light">
        <div style={{ padding: "16px 16px 0" }}>
          <Title level={5}>Админ-панель</Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selected]}
          items={[
            { key: "/admin/events", icon: <ProfileOutlined />, label: <Link to="/admin/events">Мероприятия</Link> },
            { key: "/admin/events/create", icon: <ProfileOutlined />, label: <Link to="/admin/events/create">Создать мероприятие</Link> },
            { key: "/admin/schedules", icon: <CalendarOutlined />, label: <Link to="/admin/schedules">Расписание</Link> },
            { key: "/admin/guides", icon: <TeamOutlined />, label: <Link to="/admin/guides">Гиды</Link> },
            { key: "/admin/bookings", icon: <ProfileOutlined />, label: <Link to="/admin/bookings">Бронирования</Link> },
            { key: "/admin/reports", icon: <BarChartOutlined />, label: <Link to="/admin/reports">Отчёты</Link> },
          ]}
        />
      </Sider>
      <Content style={{ padding: 20 }}>
        <Routes>
          <Route path="" element={<Navigate to="events" replace />} />
          <Route path="events" element={<AdminEventsPage />} />
          <Route path="events/create" element={<AdminEventsCreatePage />} />
          <Route path="schedules" element={<AdminSchedulesPage />} />
          <Route path="guides" element={<AdminGuidesPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Routes>
      </Content>
    </Layout>
  );
}
