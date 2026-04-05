function getLocalText(multiLangArray, lang = 'no') {
  if (!multiLangArray?.length) return null;
  return (
    multiLangArray.find((t) => t.language === lang)?.value ||
    multiLangArray.find((t) => t.language === 'no')?.value ||
    multiLangArray[0]?.value ||
    null
  );
}

export default function ServiceBanner({ situations = [], lang = 'no' }) {
  const active = situations.filter((s) => {
    const end = s.validityPeriod?.endTime;
    return !end || new Date(end) > new Date();
  });

  if (!active.length) return null;

  const messages = active
    .map((s) => getLocalText(s.summary, lang) || getLocalText(s.description, lang))
    .filter(Boolean);

  if (!messages.length) return null;

  // Duplicate for seamless loop
  const text = messages.join('   ·   ');

  return (
    <div className="service-banner">
      <span className="service-banner__icon">⚠️</span>
      <div className="service-banner__track">
        <span className="service-banner__text">
          {text}&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;{text}
        </span>
      </div>
    </div>
  );
}
