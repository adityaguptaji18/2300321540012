import express from "express";
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const fileName=fileURLToPath(import.meta.url);
const dirName=path.dirname(fileName);
const app=express();
app.use(express.json());

const logFile=path.join(dirName, 'app.log');

function logger(req,res,next) {
  const start=Date.now();
    res.on('finish',()=>{
    const duration =Date.now()-start;
    const log = {
      timestamp:new Date().toISOString(),
      method:req.method,
      url:req.originalUrl,
      status:res.statusCode,
      responseTime:`${duration}ms`,
      body:req.body
    };

    const logLine =JSON.stringify(log)+'\n';
    console.log(logLine);
    fs.appendFile(logFile,logLine,(err) => {
      if (err)console.error('Log save error:', err);
    });
    });
    next();
  }
  
  app.use(logger);
  app.get('/health',(req,res)=>{
    res.json({
      status:'Logging MiddleWare is Running!'
    })
  })

  const PORT=3000;
  app.listen(PORT,()=>{
    console.log(`Logger running on port ${PORT}`);
  })
  
  export default logger;