export interface Subtask {
  id: string
  title: string
  is_done: boolean
}

export interface Task {
  id: string
  title: string
  subtasks: Subtask[]
  created_at: string
}