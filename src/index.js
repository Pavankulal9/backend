import connectDB from './db/index.js';
import dotenv from 'dotenv';
dotenv.config({
    path:'./env'
});

app.

connectDB()
.then(()=>{
    app.listen(prosess.env.PORT || 8000,()=>{
      console.log(`Server Connected to PORT:${process.env.PORT}`);
    })
})
.catch((err)=> console.error('MONGODB connection failed!',err));

