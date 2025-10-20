import s from "./Header.module.css";
import ar from "../../assets/Icon.png";

function Header() {
  return (
    <div className={s.header_container}>
      <div className={s.textalign}>
        <h3>САМАРА</h3>
        <h3>ДЕТЯМ</h3>
      </div>
      <div className={s.links_container}>
        <a href="" className={s.link}>
          Главная
        </a>
        <a href="" className={s.link}>
          Мероприятия
        </a>
        <a href="" className={s.link}>
          Экскурсии
        </a>
        <a href="" className={s.link}>
          Мастер-классы
        </a>
        <a href="" className={s.link}>
          FAQ
        </a>
      </div>
      <div className={s.entry_container}>
        <img src={ar} className={s.entry_image} alt="" />
        <a href="" className={s.link_entry}>Войти</a>
      </div>
    </div>
  );
}
export default Header;
