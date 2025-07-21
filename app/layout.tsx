// layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../styles/globals.css";
import "@livekit/components-styles";
import "@livekit/components-styles/prefabs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://demo-conference.alprompt.space/"),

  title: {
    default: "ALPHA Meet | Conference",
    template: "%s | Tim Alpha Unair",
  },
  description:
    "ALPHA Meet adalah platform konferensi video modern untuk ujian dan diskusi daring, dikembangkan oleh Tim Alpha Unair.",

  keywords: [
    "video conference",
    "ujian daring",
    "alpha meet",
    "tim alpha unair",
    "konferensi online",
    "platform diskusi",
  ],
  authors: [{ name: "Tim Alpha Unair" }],
  creator: "Tim Alpha",
  publisher: "Tim Alpha",

  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://demo-conference.alprompt.space/",
    siteName: "ALPHA Meet",
    title: "ALPHA Meet | Conference",
    description:
      "ALPHA Meet adalah platform konferensi video modern untuk ujian dan diskusi daring, dikembangkan oleh Tim Alpha Unair.",
    images: [
      {
        url: "/favicon.ico",
        width: 1200,
        height: 630,
        alt: "ALPHA Meet | Conference",
      },
    ],
  },

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: [{ url: "/favicon.ico" }],
    apple: "/favicon.ico",
    shortcut: "/favicon.ico",
  },

  other: {
    "theme-color": "#070707",
    "msapplication-TileColor": "#070707",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        data-lk-theme="default"
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-800`}
      >
        {children}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          closeOnClick
          pauseOnHover
          draggable
          theme="colored"
          toastClassName="bg-white text-gray-800 border-red-600 shadow-red/20"
          progressClassName="bg-red-600"
        />
      </body>
    </html>
  );
}
