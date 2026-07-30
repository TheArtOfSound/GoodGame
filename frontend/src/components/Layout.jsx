import Nav from "./Nav";
import Footer from "./Footer";
import RouteEffects from "./RouteEffects";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white overflow-x-hidden">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <RouteEffects />
      <Nav />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
