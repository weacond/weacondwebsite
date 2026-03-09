export default function Navbar({ toggleLang }: { toggleLang: () => void }) {
  return (
    <nav className="flex justify-between p-4 bg-white shadow">
      <div className="font-bold text-xl">Weacond</div>
      <button
        onClick={toggleLang}
        className="bg-blue-500 text-white px-3 py-1 rounded"
      >
        切换语言
      </button>
    </nav>
  );
}
