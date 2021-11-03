
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const http = require('http');
const https = require('https');
const readline = require('readline');
const {google} = require('googleapis');

let config;
let baseUrl;
fs.readFile('config.json', (err, content) => {
	if (err) return console.log('Error loading config file:', err);
	config = content;
	baseUrl = config.baseUrl;
});

// Google Sheets Hook Setup
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';
let googleAuth;
fs.readFile('google_credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  googleAuth = content;
});
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}
// Test Function for Sheets API
function listMajors(auth) {
  const sheets = google.sheets({version: 'v4', auth});
  sheets.spreadsheets.values.get({
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    range: 'Class Data!A2:E',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      console.log('Name, Major:');
      // Print columns A and E, which correspond to indices 0 and 4.
      rows.map((row) => {
        console.log(`${row[0]}, ${row[4]}`);
      });
    } else {
      console.log('No data found.');
    }
  });
}
function getSpreadsheet(spreadsheetId, range) {
	return (auth) => {
		const sheets = google.sheets({version: 'v4', auth});
		let result = sheets.spreadsheets.values.get({
			spreadsheetId: spreadsheetId,
			range: range,
		}, (err, response) => {
			if (err) return console.log(`Error in Sheets API (Get): ${err}`);
			console.log(response.data.values);
		})
	}
}
function addDataToSpreadsheet(spreadsheetId, range, data) {
	return (auth) => {
		const sheets = google.sheets({version: 'v4', auth});
		let result = sheets.spreadsheets.values.append({
			spreadsheetId: spreadsheetId,
			range: range,
			valueInputOption: "RAW",
			insertDataOption: "INSERT_ROWS",
			resource: {
				"values": data,
			}
		}, (err, response) => {
			if (err) return console.log(`Error in Sheets API (Get): ${err}`);
			console.log(response.data.values);
		});

	}
}

// SSL Setup
var privateKey = fs.readFileSync('cert/server.key');
var certificate = fs.readFileSync('cert/server.crt');

var credentials = {key: privateKey, cert: certificate};
const app = express();
app.set('view engine', 'ejs');
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

let uniqueLogins = [];
const sheetsAPI = "https://sheets.googleapis.com";


app.get("/attendance/:day", (req, res) => {
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
    authorize(JSON.parse(googleAuth), getSpreadsheet('1laoC-XoDDj13oUOY4894ke38vLkBopcDGOYiKVQLYC8', 'A1:A10'));
    authorize(JSON.parse(googleAuth), addDataToSpreadsheet('1laoC-XoDDj13oUOY4894ke38vLkBopcDGOYiKVQLYC8', 'A1:A1', [[Date(day).toString(), "name"]]));
    let attendanceURL;
    QRCode.toDataURL(`${baseUrl}/attendance/${day}`, function (err, url) {
        attendanceURL = url;
        return res.render('pages/index.ejs', {url: attendanceURL});
    })
})

app.post("/submit", (req, res) => {
    console.log(req.body)
    return res.render('pages/confirmation.ejs')
});


var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(80);
httpsServer.listen(443);

