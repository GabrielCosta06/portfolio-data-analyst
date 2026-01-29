export const certData = [
  {
    id: "cert-pl900",
    titleKey: "cert.pl900.title",
    issuerKey: "cert.pl900.issuer",
    shortDescKey: "cert.pl900.shortDesc",
    dateKey: "cert.pl900.date",
    url: "[PL900_URL]",
    tags: ["microsoft"],
  },
  {
    id: "cert-datacamp",
    titleKey: "cert.datacamp.title",
    issuerKey: "cert.datacamp.issuer",
    shortDescKey: "cert.datacamp.shortDesc",
    dateKey: "cert.datacamp.date",
    url: "[DATACAMP_URL]",
    tags: ["data"],
  },
  {
    id: "cert-toeic",
    titleKey: "cert.toeic.title",
    issuerKey: "cert.toeic.issuer",
    shortDescKey: "cert.toeic.shortDesc",
    dateKey: "cert.toeic.date",
    url: "[TOEIC_URL]",
    tags: ["english"],
  },
];

function fallbackEntry(key) {
  return { en: key, "pt-BR": key };
}

export function buildCertificates(i18nMap) {
  return certData.map((cert) => {
    const title = i18nMap[cert.titleKey] || fallbackEntry(cert.titleKey);
    const issuer = i18nMap[cert.issuerKey] || fallbackEntry(cert.issuerKey);
    const shortDesc = i18nMap[cert.shortDescKey] || fallbackEntry(cert.shortDescKey);
    const date = i18nMap[cert.dateKey] || fallbackEntry(cert.dateKey);
    const searchIndex = [
      title.en,
      title["pt-BR"],
      issuer.en,
      issuer["pt-BR"],
      shortDesc.en,
      shortDesc["pt-BR"],
    ]
      .join(" ")
      .toLowerCase();

    return {
      ...cert,
      title,
      issuer,
      shortDesc,
      date,
      searchIndex,
    };
  });
}
