type NavbarProps = {
  toggleLang: () => void
}

export default function Navbar({ toggleLang }: NavbarProps) {
  return (
    <nav className="flex justify-between items-center p-4 bg-slate-800">
      <div className="text-xl font-bold">Weacond</div>
      <button
        className="bg-gray-700 text-white px-3 py-1 rounded"
        onClick={toggleLang}
      >
        切换语言
      </button>
    </nav>
  )
}
