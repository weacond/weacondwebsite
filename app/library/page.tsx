import books from "@/data/books"
import BookCard from "@/components/BookCard"

export default function Library(){

return(

<div>

<h1 className="text-3xl mb-8">
电子书库
</h1>

<div className="flex gap-6 overflow-x-auto pb-6">

{books.map(book=>(
<BookCard key={book.id} book={book}/>
))}

</div>

</div>

)

}
