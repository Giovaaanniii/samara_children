import card from "../../assets/card.jpg";
import s from "./Busyness.module.css";
function Busyness() {
  return (
    <div className={s.busyness_container}>
      <div className={s.busyness_question}>
        <p>Что мы организовываем?</p>
      </div>

      <div className={s.busyness_cards}>
        <div className={s.busyness_card_container}>
          <div className={s.busyness_card}>
            <img src={card} className={s.card_image} alt="экскурсии" />
          </div>
          <p className={s.card_text}>Авторские тематические экскурсии</p>
        </div>

        <div className={s.busyness_card_container}>
          <div className={s.busyness_card}>
            <img src={card} className={s.card_image} alt="программы" />
          </div>
          <p className={s.card_text}>Выездные образовательные программы</p>
        </div>

        <div className={s.busyness_card_container}>
          <div className={s.busyness_card}>
            <img
              src={card}
              className={s.card_image}
              alt="Праздники и выпускные"
            />
          </div>
          <p className={s.card_text}>Праздники и выпускные для классов</p>
        </div>

        <div className={s.busyness_card_container}>
          <div className={s.busyness_card}>
            <img src={card} className={s.card_image} alt="мастер-классы" />
          </div>
          <p className={s.card_text}>Творческие и научные мастер-классы</p>
        </div>

        <div className={s.busyness_card_container}>
          <div className={s.busyness_card}>
            <img
              src={card}
              className={s.card_image}
              alt="туры на предприятия"
            />
          </div>
          <p className={s.card_text}>Профориентационные туры на предприятия</p>
        </div>

        <div className={s.busyness_card_container}>
          <div className={s.busyness_card}>
            <img src={card} className={s.card_image} alt="приключенияz" />
          </div>
          <p className={s.card_text}>Сезонные и каникулярные приключения</p>
        </div>
      </div>
    </div>
  );
}
export default Busyness;
