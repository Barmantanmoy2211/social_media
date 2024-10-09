import express, { urlencoded } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from './utils/db.js';
import userRoute from './routes/user.routes.js';
import postRoute from './routes/post.routes.js';

dotenv.config({});

const app = express();

const port = process.env.PORT || 3000;

app.get("/", (req,res) => {
    return res.status(200).json({
        message: "Hello I am coming from server",
    })
})

app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));
const corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true,
}
app.use(cors(corsOptions));

//api routes
app.use('/api/v1/user', userRoute);
app.use('/api/v1/post', postRoute);


app.listen(port, () => {
    connectDB();
    console.log(`Server is running on port ${port}`)
})
