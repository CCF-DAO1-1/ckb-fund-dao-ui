import type { Metadata, Viewport } from "next";
import "./globals.css";
import "react-tooltip/dist/react-tooltip.css";
import { Toaster } from "react-hot-toast";
import TooltipClient from "@/components/common/TooltipClient";

import { I18nProvider } from "../contexts/I18nContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

import { LayoutProvider } from "./layoutProvider";
import Banner from "@/components/layout/Banner";
import WalletConnectionModal from "@/components/user-login/WalletConnectionModal";

export const metadata: Metadata = {
  title: "CKB CFD",
  description: "CKB Community Fund DAO - 治理平台",
  icons: {
    icon: "/nervos-logo.svg",
    shortcut: "/nervos-logo.svg",
    apple: "/nervos-logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`} suppressHydrationWarning={true}>
        <LayoutProvider>
          <I18nProvider>
            <Header />
            <Banner />
            <main className="main-content">{children}</main>
            <TooltipClient />
            <Footer />
            <Toaster position="top-center" toastOptions={{ duration: 1500 }} />
            <WalletConnectionModal />
          </I18nProvider>
        </LayoutProvider>
      </body>
    </html>
  );
}
