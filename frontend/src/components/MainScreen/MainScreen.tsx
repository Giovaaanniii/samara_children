import s from "./MainScreen.module.css";
import ladya from "../../assets/ladya.png";
import { useState } from "react";

function MainScreen() {
  const [activeButton, setActiveButton] = useState("online");
  const handleClickOnline = () => {
    setActiveButton("online");
  };
  const handleClickOffline = () => {
    setActiveButton("offline");
  };
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
            <button
              className={s.offline_button}
              onClick={handleClickOffline}
              style={{
                background: activeButton === "offline" ? "white" : "aliceblue",
                border: activeButton === "offline" ? "2px solid red" : "none",
                color: activeButton === "offline" ? "red" : "black",
              }}
            >
              лично
            </button>
            <button
              className={s.online_button}
              style={{
                background: activeButton === "online" ? "white" : "aliceblue",
                border: activeButton === "online" ? "2px solid red" : "none",
                color: activeButton === "online" ? "red" : "black",
              }}
              onClick={handleClickOnline}
            >
              онлайн
            </button>
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
