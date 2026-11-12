import Head from "next/head";
import LocaleAlias from "../components/LocaleAlias";

// /en — English language alias: sets English and redirects home (noindex, avoid duplicate content)
export const metadata = {
  title: "English — Weacond",
  robots: { index: false, follow: true },
};

export default function EnAlias() {
  return (
    <>
      <Head>
        <title>English — Weacond</title>
      </Head>
      <LocaleAlias locale="en" />
    </>
  );
}
