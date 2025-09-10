import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import TrekMap from './components/Maps'
import {BrowserRouter,Routes,Route,useNavigate} from "react-router-dom" 
function App() {

return (
  <BrowserRouter>
  <Routes>
    <Route path="/maps" element={<TrekMap></TrekMap>}></Route>
  </Routes>
  </BrowserRouter>
)

}

export default App
