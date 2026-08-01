export interface Microtask {
  id: string
  title: string
  is_done: boolean
}

export interface Subtask {
  id: string
  title: string
  is_done: boolean
  microtasks?: Microtask[] // Знак вопроса означает, что этого поля может не быть
}

export interface Task {
  id: string
  title: string
  subtasks: Subtask[]
  created_at: string
}