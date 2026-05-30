import { Typography } from "antd";

import styles from "../pages/LegalDocumentPage.module.css";

const { Title, Paragraph } = Typography;

type Section = { title: string; paragraphs: string[] };

type Props = {
  pageTitle: string;
  intro?: string;
  sections: Section[];
};

export default function LegalDocumentView({ pageTitle, intro, sections }: Props) {
  return (
    <div className={styles.wrap}>
      <Title level={1} className={styles.title}>
        {pageTitle}
      </Title>
      {intro ? <Paragraph className={styles.intro} type="secondary">{intro}</Paragraph> : null}
      {sections.map((section) => (
        <section key={section.title} className={styles.section}>
          <Title level={3} className={styles.sectionTitle}>
            {section.title}
          </Title>
          {section.paragraphs.map((text, i) => (
            <Paragraph key={`${section.title}-${i}`} className={styles.paragraph}>
              {text}
            </Paragraph>
          ))}
        </section>
      ))}
    </div>
  );
}

