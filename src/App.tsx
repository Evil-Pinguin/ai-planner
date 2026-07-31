import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import { type Task } from './types'

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [scaryTask, setScaryTask] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки задач', error)
      } else if (data) {
        setTasks(data as Task[])
      }
      setIsLoading(false)
    }

    fetchTasks()
  }, [])

      const handleGenerate = async () => {
    if (!scaryTask) return
    setIsGenerating(true)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: scaryTask })
      })

      if (!response.ok) {
        throw new Error('Ошибка при генерации')
      }

      const data = await response.json()
      
      // 1. Форматируем подзадачи под наш интерфейс Subtask
      const formattedSubtasks = data.subtasks.map((subtask: { title: string }, index: number) => ({
        id: `${Date.now()}-${index}`,
        title: subtask.title,
        is_done: false
      }))

      // 2. Сохраняем в Supabase
      const { data: insertedData, error } = await supabase
        .from('tasks')
        .insert([
          { title: scaryTask, subtasks: formattedSubtasks }
        ])
        .select()

      if (error) throw error

      // 3. Добавляем в стейт, чтобы задача сразу появилась на экране
      if (insertedData && insertedData.length > 0) {
        setTasks((prevTasks) => [insertedData[0] as Task, ...prevTasks])
      }
      
      setScaryTask('')
    } catch (error) {
      console.error('Ошибка генерации:', error)
    } finally {
      setIsGenerating(false)
    }
  }

    return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>AI Планировщик</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          type="text" 
          value={scaryTask}
          onChange={(e) => setScaryTask(e.target.value)}
          placeholder="Например: Сделать портфолио"
          style={{ flexGrow: 1, padding: '8px' }}
        />
          <button 
          onClick={handleGenerate}
          disabled={!scaryTask || isGenerating}
          style={{ padding: '8px 16px' }}
        >
          {isGenerating ? 'Думаю...' : 'Разбить на шаги'}
        </button>
      </div>

           {isLoading ? (
        <p>Загрузка задач...</p>
      ) : (
        <div>
          {tasks.length === 0 && <p>Пока нет задач. Добавь первую!</p>}
          {tasks.map((task) => (
            <div key={task.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0 }}>{task.title}</h3>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {task.subtasks.map((subtask) => (
                  <li key={subtask.id} style={{ marginBottom: '8px', listStyleType: 'none' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={subtask.is_done} 
                        readOnly 
                      />
                      {subtask.title}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App