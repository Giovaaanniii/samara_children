import s from "./MainScreen.module.css";
import ladya from "../../assets/ladya.png";

function MainScreen() {
  return (
    <div className={s.main_wpapper}>
      <div className={s.info_wrapper}>
        <div className={s.text_wpapper}>
          <p className={s.h_text}>
            Экскурсии для школьников в Самаре. Организация мероприятий
          </p>

          <p className={s.p_text}>
            Мы делаем все для того, что подарить Вашим детям свежие эмоции,
            яркие переживания и невероятные приключения, которые запомнятся на
            всю жизнь!
          </p>
        </div>
        <div className={s.buttons_wrapper}>
            <div className={s.format_buttons}>
                <button  className={s.offline_button}>лично</button>
                <button className={s.online_button}>онлайн</button>
            </div>
            <div>
                <button className={s.sign_up}>Записаться</button>
            </div>
        </div>
      </div>

      <div className={s.ladya_wrapper}>
        <img src={ladya} className={s.ladya_image} alt="ладья" />
      </div>
    </div>
  );
}
export default MainScreen;
