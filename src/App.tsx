import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import { type Task, type Subtask, type Microtask } from './types'
import confetti from 'canvas-confetti'

// Функция для сохранения подзадач в базу
const updateTaskInDB = async (taskId: string, newSubtasks: Subtask[]) => {
  const { error } = await supabase
    .from('tasks')
    .update({ subtasks: newSubtasks })
    .eq('id', taskId)
    
  if (error) console.error('Ошибка сохранения в БД', error)
}
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
    let justCompleted = false
    let updatedSubtasks: Subtask[] = [] // Сюда сохраним новый массив для БД

    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        const wasAllDone = task.subtasks.length > 0 && task.subtasks.every(st => st.is_done)

        updatedSubtasks = task.subtasks.map(st => {
          if (st.id === subtaskId) {
            return { ...st, is_done: !st.is_done }
          }
          return st
        })

        const isAllDoneNow = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.is_done)

        if (!wasAllDone && isAllDoneNow) {
          justCompleted = true
        }

        return { ...task, subtasks: updatedSubtasks }
      }
      return task
    }))

    if (justCompleted) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      })
    }

    // Сохраняем обновленный массив в Supabase
    if (updatedSubtasks.length > 0) {
      updateTaskInDB(taskId, updatedSubtasks)
    }
  }

    const toggleMicrotaskDone = (taskId: string, subtaskId: string, microtaskId: string) => {
    let updatedSubtasks: Subtask[] = []

    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        updatedSubtasks = task.subtasks.map(st => {
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
        return { ...task, subtasks: updatedSubtasks }
      }
      return task
    }))

    // Сохраняем в базу
    if (updatedSubtasks.length > 0) {
      updateTaskInDB(taskId, updatedSubtasks)
    }
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

      let newSubtasksArray: Subtask[] = []

      setTasks(prevTasks => prevTasks.map(task => {
        if (task.id === taskId) {
          newSubtasksArray = task.subtasks.map(st => {
            if (st.id === subtask.id) {
              return { ...st, microtasks: formattedMicrotasks }
            }
            return st
          })
          return { ...task, subtasks: newSubtasksArray }
        }
        return task
      }))

      // Сохраняем обновленный массив подзадач с новыми микрозадачами в БД
      if (newSubtasksArray.length > 0) {
        updateTaskInDB(taskId, newSubtasksArray)
      }

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
    <div style={{ padding: '40px 20px', maxWidth: '680px', margin: '0 auto' }}>
      <h1>AI Планировщик</h1>
      
            <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '32px', 
        backgroundColor: '#ffffff', 
        padding: '8px', 
        borderRadius: '18px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)' // Мягкая тень капсулы
      }}>
        <input 
          type="text" 
          value={scaryTask}
          onChange={(e) => setScaryTask(e.target.value)}
          placeholder="Например: Сделать портфолио"
          style={{ 
            flexGrow: 1, 
            padding: '8px 12px', 
            border: 'none', 
            backgroundColor: 'transparent',
            outline: 'none'
          }}
        />
        <button 
          onClick={handleGenerate}
          disabled={!scaryTask || isGenerating}
          style={{ padding: '10px 20px', flexShrink: 0 }}
        >
          {isGenerating ? 'Думаю...' : 'Разбить'}
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: '#86868b' }}>Загрузка задач...</p>
      ) : (
        <div>
          {tasks.length === 0 && <p style={{ color: '#86868b' }}>Пока нет задач. Добавь первую!</p>}
                    {tasks.map((task) => {
            const isExpanded = expandedTaskId === task.id
            
            // Считаем прогресс
            const totalSubtasks = task.subtasks.length
            const doneSubtasks = task.subtasks.filter(st => st.is_done).length
            const progress = totalSubtasks > 0 ? (doneSubtasks / totalSubtasks) * 100 : 0
            const isAllDone = doneSubtasks === totalSubtasks && totalSubtasks > 0

            return (
              <div key={task.id} style={{ 
                border: '1px solid #e8e8ed', 
                padding: '24px', 
                marginBottom: '16px', 
                borderRadius: '18px', 
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)' // Едва заметная тень для объема
              }}>
                                                <div 
                  onClick={() => toggleTask(task.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '12px' }}
                >
                  <h3 style={{ 
                    margin: 0, 
                    color: isAllDone ? '#34c759' : '#1d1d1f', // Зеленый Apple, если всё готово
                    transition: 'color 0.3s' 
                  }}>
                    {task.title}
                  </h3>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    style={{ 
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease-in-out',
                      color: '#86868b'
                    }}
                  >
                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Сам прогресс-бар */}
                <div style={{ 
                  width: '100%', 
                  height: '6px', 
                  backgroundColor: '#e8e8ed', 
                  borderRadius: '980px', 
                  overflow: 'hidden' 
                }}>
                  <div style={{ 
                    width: `${progress}%`, 
                    height: '100%', 
                    backgroundColor: isAllDone ? '#34c759' : '#0071e3', 
                    borderRadius: '980px',
                    transition: 'width 0.4s ease-in-out, background-color 0.3s' 
                  }} />
                </div>

                {isExpanded && (
                  <ul style={{ paddingLeft: '0', margin: '20px 0 0 0' }}>
                    {task.subtasks.map((subtask, index) => (
                      <li key={subtask.id} style={{ marginBottom: '16px', listStyleType: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span 
                            onClick={() => toggleSubtaskDone(task.id, subtask.id)}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: '2px solid #0071e3',
                              color: subtask.is_done ? 'white' : '#0071e3',
                              backgroundColor: subtask.is_done ? '#0071e3' : 'transparent',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              fontSize: '12px',
                              fontWeight: '600',
                              flexShrink: 0,
                              cursor: 'pointer',
                              transition: 'background-color 0.2s, color 0.2s, border-color 0.2s'
                            }}
                          >
                            {index + 1}
                          </span>
                          <span style={{ 
                            flexGrow: 1, 
                            fontSize: '16px',
                            textDecoration: subtask.is_done ? 'line-through' : 'none',
                            color: subtask.is_done ? '#86868b' : '#1d1d1f',
                            transition: 'color 0.2s'
                          }}>
                            {subtask.title}
                          </span>
                          <button 
                            onClick={() => handleGenerateMicrotasks(task.id, subtask)}
                            disabled={generatingSubtaskId === subtask.id}
                            style={{ 
                              fontSize: '13px', 
                              padding: '6px 12px', 
                              backgroundColor: '#f5f5f7', 
                              color: '#0071e3', 
                              borderRadius: '980px',
                              border: '1px solid #d2d2d7'
                            }}
                          >
                            {generatingSubtaskId === subtask.id ? '...' : 'Еще проще'}
                          </button>
                        </div>

                        {/* Блок микрозадач (если они есть) */}
                        {subtask.microtasks && subtask.microtasks.length > 0 && (
                          <ul style={{ paddingLeft: '36px', marginTop: '12px' }}>
                            {subtask.microtasks.map((mt, mtIndex) => (
                              <li key={mt.id} style={{ marginBottom: '8px', listStyleType: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                <span 
                                  onClick={() => toggleMicrotaskDone(task.id, subtask.id, mt.id)}
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    border: '2px solid #d2d2d7',
                                    color: mt.is_done ? 'white' : '#86868b',
                                    backgroundColor: mt.is_done ? '#86868b' : 'transparent',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    flexShrink: 0,
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s, color 0.2s, border-color 0.2s'
                                  }}
                                >
                                  {index + 1}.{mtIndex + 1}
                                </span>
                                <span style={{ 
                                  textDecoration: mt.is_done ? 'line-through' : 'none',
                                  color: mt.is_done ? '#aeaeb2' : '#6e6e73',
                                  transition: 'color 0.2s'
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