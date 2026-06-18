import Nav from "./Nav";
import Footer from "./Footer";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white overflow-x-hidden">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
