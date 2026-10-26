import { useState, useEffect } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  const [status, setStatus] = useState("LOADING")
  useEffect(()=>{
    fetch('/api/actuator/health')
      .then((res)=>(res.ok? res.json(): Promise.reject(res.status)))
      .then((data)=> setStatus(data.status))
      .catch(()=> setStatus('DOWN'))
  },[])

  return (
    <main style={{fontFamily: 'sans-serif', padding:24}}>
      <h1>MAIFit</h1>
      <p>
        Backend Status: <strong>{status}</strong>
      </p>
    </main>
  )
}


export default App
