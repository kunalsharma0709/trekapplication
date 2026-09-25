import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import TrekMap from './components/Maps'
import  {Signup}  from './components/Signup'
import { Signin } from './components/Signin'
import {BrowserRouter,Routes,Route,useNavigate} from "react-router-dom" 
function App() {

return (
  <BrowserRouter>
  <Routes>
    <Route path="/maps" element={<TrekMap></TrekMap>}></Route>
    <Route path="/signup" element={<Signup></Signup>}></Route>
    <Route path="/signin" element={<Signin></Signin>}></Route>
  </Routes>
  </BrowserRouter>
)

}

export default App
