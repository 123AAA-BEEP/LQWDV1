import Script from "next/script";

/**
 * Google Ads base tag — loads ONLY when NEXT_PUBLIC_GOOGLE_ADS_ID is set
 * (AW-XXXXXXXXX), so nothing changes until the founder wires the account.
 * The signup conversion is fired once per account by SignupConversion in
 * the dashboard layout (campaign plan §6). No remarketing audiences are
 * configured here; that is a separate, explicit decision.
 */
export function GoogleAdsTag() {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "";
  if (!/^AW-\d{6,14}$/.test(id)) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}
