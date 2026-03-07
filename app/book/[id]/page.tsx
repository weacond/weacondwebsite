"use client"

import { useParams } from "next/navigation"
import books from "@/data/books"
import { useState } from "react"

export default function BookPage(){

const params = useParams()

const book = books.find(b=>b.id===params.id)

const [read,setRead] = useState<string[]>([])

function markRead(chapter){

if(!read.includes(chapter)){

setRead([...read,chapter])

}

}

return(

<div>

<h1 className="text-4xl mb-4">
{book.title}
</h1>

<p className="text-gray-400 mb-8">
{book.description}
</p>

<div className="space-y-3">

{book.chapters.map(chapter=>(

<div
key={chapter}
onClick={()=>markRead(chapter)}
className="cursor-pointer p-3 bg-slate-800 rounded-lg flex justify-between"
>

<span>{chapter}</span>

<span>
{read.includes(chapter) ? "已读" : "未读"}
</span>

</div>

))}

</div>

</div>

)

}
