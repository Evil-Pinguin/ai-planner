import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import { type Task, type Subtask, type Microtask } from './types'

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [scaryTask, setScaryTask] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [generatingSubtaskId, setGeneratingSubtaskId] = useState<string | null>(null)

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

  const toggleTask = (id: string) => {
    setExpandedTaskId(prevId => prevId === id ? null : id)
  }

  const toggleSubtaskDone = (taskId: string, subtaskId: string) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks.map(st => {
            if (st.id === subtaskId) {
              return { ...st, is_done: !st.is_done }
            }
            return st
          })
        }
      }
      return task
    }))
  }

  const toggleMicrotaskDone = (taskId: string, subtaskId: string, microtaskId: string) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks.map(st => {
            if (st.id === subtaskId && st.microtasks) {
              return {
                ...st,
                microtasks: st.microtasks.map(mt => {
                  if (mt.id === microtaskId) {
                    return { ...mt, is_done: !mt.is_done }
                  }
                  return mt
                })
              }
            }
            return st
          })
        }
      }
      return task
    }))
  }

  const handleGenerateMicrotasks = async (taskId: string, subtask: Subtask) => {
    setGeneratingSubtaskId(subtask.id)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: subtask.title })
      })

      if (!response.ok) throw new Error('Ошибка генерации микрозадач')
      
      const data = await response.json()

      const formattedMicrotasks: Microtask[] = data.subtasks.map((m: { title: string }, index: number) => ({
        id: `${Date.now()}-${index}`,
        title: m.title,
        is_done: false
      }))

      setTasks(prevTasks => prevTasks.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            subtasks: task.subtasks.map(st => {
              if (st.id === subtask.id) {
                return { ...st, microtasks: formattedMicrotasks }
              }
              return st
            })
          }
        }
        return task
      }))

    } catch (error) {
      console.error(error)
    } finally {
      setGeneratingSubtaskId(null)
    }
  }

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
      
      const formattedSubtasks = data.subtasks.map((subtask: { title: string }, index: number) => ({
        id: `${Date.now()}-${index}`,
        title: subtask.title,
        is_done: false
      }))

      const { data: insertedData, error } = await supabase
        .from('tasks')
        .insert([
          { title: scaryTask, subtasks: formattedSubtasks }
        ])
        .select()

      if (error) throw error

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
          {tasks.map((task) => {
            const isExpanded = expandedTaskId === task.id

            return (
              <div key={task.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
                <div 
                  onClick={() => toggleTask(task.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <h3 style={{ margin: 0 }}>{task.title}</h3>
                  <span style={{ fontSize: '12px', color: '#555' }}>{isExpanded ? '▲ Свернуть' : '▼ Развернуть'}</span>
                </div>

                {isExpanded && (
                  <ul style={{ paddingLeft: '0', margin: '15px 0 0 0' }}>
                    {task.subtasks.map((subtask, index) => (
                      <li key={subtask.id} style={{ marginBottom: '12px', listStyleType: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span 
                            onClick={() => toggleSubtaskDone(task.id, subtask.id)}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: '1px solid #0070f3',
                              color: subtask.is_done ? 'white' : '#0070f3',
                              backgroundColor: subtask.is_done ? '#0070f3' : 'transparent',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              fontSize: '14px',
                              fontWeight: 'bold',
                              flexShrink: 0,
                              cursor: 'pointer',
                              transition: 'background-color 0.2s, color 0.2s'
                            }}
                          >
                            {index + 1}
                          </span>
                          <span style={{ 
                            flexGrow: 1, 
                            textDecoration: subtask.is_done ? 'line-through' : 'none',
                            color: subtask.is_done ? '#888' : '#1a1a1a'
                          }}>
                            {subtask.title}
                          </span>
                          <button 
                            onClick={() => handleGenerateMicrotasks(task.id, subtask)}
                            disabled={generatingSubtaskId === subtask.id}
                            style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#f0f0f0', color: '#333', borderRadius: '4px' }}
                          >
                            {generatingSubtaskId === subtask.id ? '...' : 'Еще проще'}
                          </button>
                        </div>

                        {/* Блок микрозадач (если они есть) */}
                        {subtask.microtasks && subtask.microtasks.length > 0 && (
                          <ul style={{ paddingLeft: '34px', marginTop: '12px' }}>
                            {subtask.microtasks.map((mt, mtIndex) => (
                              <li key={mt.id} style={{ marginBottom: '8px', listStyleType: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#555' }}>
                                <span 
                                  onClick={() => toggleMicrotaskDone(task.id, subtask.id, mt.id)}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    border: '1px solid #ccc',
                                    color: mt.is_done ? 'white' : '#888',
                                    backgroundColor: mt.is_done ? '#888' : 'transparent',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    fontSize: '11px',
                                    flexShrink: 0,
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s, color 0.2s'
                                  }}
                                >
                                  {index + 1}.{mtIndex + 1}
                                </span>
                                <span style={{ 
                                  textDecoration: mt.is_done ? 'line-through' : 'none',
                                  color: mt.is_done ? '#bbb' : '#555'
                                }}>
                                  {mt.title}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default App