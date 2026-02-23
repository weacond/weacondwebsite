import "./globals.css";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <div className="container">
          
          <aside className="sidebar">
            <h1 className="logo">Financial System</h1>

            <nav>
              <Link href="/">我的业务</Link>
              <Link href="/library">电子书库</Link>
            </nav>
          </aside>

          <main className="content">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}
