const express = require("express");
const axios = require('axios');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 3000;
const clientId = process.env.UPSTOX_CLIENT_ID;
const clientSecret = process.env.UPSTOX_CLIENT_SECRET;
const redirectUri = 'http://localhost:3000/auth/upstox/callback';


app.get('/auth/upstox', (req, res) => {
    try {
        const responseType = 'code';
        const redirectUri = 'http://localhost:3000/auth/upstox/callback';
        const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=${responseType}&client_id=${clientId}&redirect_uri=${redirectUri}`;
        console.log('Redirecting to Upstox login page:', authUrl);
        
        res.redirect(authUrl);
    } catch (error) {
        console.log('Authentication error:', error.message);
        res.status(500).send('Authentication error');
    }
});


app.get('/auth/upstox/callback', async (req, res) => {
    try {
        const { code } = req.query;
        console.log("Code" +code)
        if (!code) {
            return res.status(400).send('Authorization code not found');
        }

        
        const tokenResponse = await axios.post('https://api.upstox.com/v2/login/authorization/token', {
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        },{
            headers: {
              'accept': 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log("Token Response" + tokenResponse)  

        
        const accessToken = tokenResponse.data.access_token;

        console.log("Access Token " + accessToken)
        console.log("-------------------")

        
        const userResponse = await axios.get('https://api.upstox.com/v2/user/profile', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        
        console.log('User details:', userResponse.data);

        
        res.send('Authentication successful');
    } catch (error) {
        console.error('Authentication error:', error.response ? error.response.data : error.message);
        res.status(500).send('Authentication error');
    }
});

app.get('/holdings', async (req,res) => {
    try {
        const accessToken = req.headers.authorization.split(' ')[1];
        console.log("Access Token1 " + accessToken)

        const holdingsResponse = await axios.get('https://api.upstox.com/v2/portfolio/long-term-holdings', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json'
            }
        })

        console.log("Holdings Response " + holdingsResponse)

        const holdingsData = holdingsResponse.data;
        res.json(holdingsData);
    } catch (error) {
        console.error('Error fetching holdings:', error.response ? error.response.data : error.message);
        res.status(500).send('Error fetching holdings');
    }
})


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});