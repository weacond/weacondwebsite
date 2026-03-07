import Link from "next/link"

export default function BookCard({book}){

return(

<Link href={`/book/${book.id}`}>

<div className="min-w-[200px] h-[260px] bg-slate-800 rounded-xl p-6 flex items-center justify-center text-center">

{book.title}

</div>

</Link>

)

}
