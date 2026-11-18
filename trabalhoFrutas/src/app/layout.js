import "./globals.css";

export const metadata = {
  title: "Fruta no Copo | Monte seu milkshake",
  description: "Monte milkshakes de frutas, estime calorias e salve suas combinações.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
