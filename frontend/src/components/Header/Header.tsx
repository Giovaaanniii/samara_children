import s from "./Header.module.css";
import ar from "../../assets/Icon.png";
import { Link } from 'react-router-dom';
function Header() {
  return (
    <div className={s.header_container}>
      <div className={s.textalign}>
        <h3>САМАРА</h3>
        <h3>ДЕТЯМ</h3>
      </div>
      <div className={s.links_container}>
        <Link  to="/" className={s.link}>
          Главная
        </Link >
        <Link  to="/events" className={s.link}>
          Мероприятия
        </Link >
        <Link  to="/excursions" className={s.link}>
          Экскурсии
        </Link >
        <Link  to="/workshops" className={s.link}>
          Мастер-классы
        </Link >
        <Link  to="/faq" className={s.link}>
          FAQ
        </Link >
      </div>
      <div className={s.entry_container}>
        <img src={ar} className={s.entry_image} alt="" />
        <Link to="sign" className={s.link_entry}>Войти</Link>
      </div>
    </div>
  );
}
export default Header;
