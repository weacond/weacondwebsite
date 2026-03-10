export type Book = {
  id: string
  titleCN: string
  titleEN: string
  chapters: string[]
}

export const books: Book[] = Array.from({ length: 20 }).map((_, i) => ({
  id: (i + 1).toString(),
  titleCN: `书籍 ${i + 1}`,
  titleEN: `Book ${i + 1}`,
  chapters: Array.from({ length: 5 }).map((_, j) => `章节 ${j + 1}`) 
}))
