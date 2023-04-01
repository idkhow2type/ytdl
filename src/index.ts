import express from 'express';
import ytdl from 'ytdl-core';
import cookie from 'cookie-parser';
import fs from 'fs';
import ffmpeg from 'ffmpeg';
import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';

const app = express();

app.use(cookie());
app.use(express.static('public'));
app.set('views', './views');

// app.get('/',(req,res)=>{
//     ytdl(req.cookies.id,{
//         begin: req.cookies.begin,
//     }).pipe(fs.createWriteStream(`./public/${req.cookies.id}.avi`))
// })

app.get('/watch', async (req, res) => {
    const id = req.query.v?.toString() ?? '';
    ytdl(id, { quality: 'lowest' })
        .pipe(fs.createWriteStream(`./download/process/${id}.avi`))
        .on('finish', async () => {
            const process = new ffmpeg(`./download/process/${id}.avi`);
            const meta = await ffprobe(`./download/process/${id}.avi`, {
                path: ffprobeStatic.path,
            });

            await process.then(async (video) => {
                video.addCommand('-vf', 'scale=160:-1');
                await video.save(`./download/out/${id}.avi`);
            });
            fs.unlink(`./download/process/${id}.avi`, (err) => {
                if (err) console.log(err);
            });
            res.download(`./download/out/${id}.avi`,err=>{
                if (err) console.log(err);
                fs.unlink(`./download/out/${id}.avi`, (err) => {
                    if (err) console.log(err);
                });
            })
        });
});

const port = 3000;
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});
