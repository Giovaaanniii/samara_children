import LegalDocumentView from "../components/LegalDocumentView";
import { privacySections } from "../content/legalPrivacy";

export default function PrivacyPage() {
  return (
    <LegalDocumentView
      pageTitle="Политика обработки персональных данных"
      intro="Политика разработана в соответствии с Федеральным законом № 152-ФЗ «О персональных данных» и определяет цели, состав, порядок обработки и права субъектов персональных данных при использовании платформы «Самара Детям»."
      sections={privacySections}
    />
  );
}

