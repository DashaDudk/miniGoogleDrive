const express = require ("express");
const path = require("path");
const multer = require("multer");


const app = express();

//diskStorage в multer потрібен для зберігання файлів на диску (папка uploads), а не наприклад в пам'яті
//бібліотека multer потребує 2 правила: 1)destination (куди класти файл) , 2)filename (під яким ім'ям зберігати)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "uploads"));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({storage});


app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

app.get("/test", (req, res)=> {
    res.json({status:"ok", message:"backend is working"});
});

app.post("/upload", upload.single("file"), (req, res) =>{
    if(!req.file){
        return res.status(400).json({
            status:"error",
            message: "Файл не надіслано"});
    };

    res.json({
        status: "ok",
        message: "Файл успішно завантажено",
        filename: req.file.filename,
        path: req.file.path
    });
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`server running on: http://localhost:${PORT}`);
});

