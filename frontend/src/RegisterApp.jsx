import React,{useState} from 'react';
import Register from './Register.jsx';

export default function RegisterApp(){const [lang,setLang]=useState(localStorage.lang||'en');return <Register lang={lang} setLang={setLang}/>}
