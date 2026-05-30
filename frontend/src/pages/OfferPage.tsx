import LegalDocumentView from "../components/LegalDocumentView";
import { offerSections } from "../content/legalOffer";

export default function OfferPage() {
  return (
    <LegalDocumentView
      pageTitle="Публичная оферта"
      intro="Настоящая оферта регулирует использование платформы «Самара Детям», порядок бронирования и оплаты, а также разграничивает ответственность оператора информационного сервиса и экскурсионного бюро — исполнителя услуг."
      sections={offerSections}
    />
  );
}

