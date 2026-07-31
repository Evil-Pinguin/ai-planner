export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { task } = req.body;

  if (!task) {
    return res.status(400).json({ error: 'Task is required' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "Ты — помощник, который разбивает большие задачи на 3-5 маленьких шагов. Отвечай СТРОГО в формате JSON объекта. Формат: {\"subtasks\": [{\"title\": \"Шаг 1\"}, {\"title\": \"Шаг 2\"}]}."
          },
          {
            role: "user",
            content: `Разбей задачу: "${task}"`
          }
        ],
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error('Ошибка запроса к Groq API');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    
    // Парсим ответ от ИИ
    const parsed = JSON.parse(content);
    const subtasks = parsed.subtasks || [];

    res.status(200).json({ subtasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate subtasks' });
  }
}