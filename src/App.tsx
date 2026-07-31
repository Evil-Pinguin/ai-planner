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
      console.log('Получили подзадачи от ИИ:', data.subtasks)
      
      // Пока просто очищаем инпут после успеха
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
        <p>Задач в базе: {tasks.length}</p>
      )}
    </div>
  )
}

export default App