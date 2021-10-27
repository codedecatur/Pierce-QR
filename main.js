const express = require('express');
const QRCode = require('qrcode')
const app = express();
app.set('view engine', 'ejs');
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));


let uniqueLogins = [];
const baseUrl = "https://dev.hayden.gg/"

app.get("/attendence/:day", (req, res) => {
    let day = req.params.day;
    // if (day in uniqueLogins) {
    //     return res.redirect("/");
    // }
    // uniqueLogins.push(day);
    return res.render("pages/attendance.ejs", {time: day})
});

app.get("/", (req, res) => {
    let day = Date.now();
    console.log(day);
    let attendanceURL;
    QRCode.toDataURL(`${baseUrl}/attandence/${day}`, function (err, url) {
        attendanceURL = url;
        return res.render('pages/index.ejs', {url: attendanceURL});
    })
})

app.post("/submit", (req, res) => {
    console.log(req.body)
    return res.render('pages/confirmation.ejs')
});


app.listen(8080);