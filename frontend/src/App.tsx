import { useEffect, useState } from 'react'

type HealthResponse = {
  status: string
  sqliteVersion: string
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch((err) => setError(String(err)))
  }, [])

  return (
    <main>
      <h1>Savings</h1>
      {health && (
        <p>backend: {health.status}, sqlite: {health.sqliteVersion}</p>
      )}
      {error && <p>backend error: {error}</p>}
    </main>
  )
}

export default App
