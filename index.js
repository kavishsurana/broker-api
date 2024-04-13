const express = require("express");
const axios = require('axios');
require('dotenv').config();
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();

const PORT = process.env.PORT || 3000;
const clientId = process.env.UPSTOX_CLIENT_ID;
const clientSecret = process.env.UPSTOX_CLIENT_SECRET;
const redirectUri = 'http://localhost:3000/auth/upstox/callback';

let accessToken = null;


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

        
        accessToken = tokenResponse.data.access_token;

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
        //const accessToken = req.headers.authorization.split(' ')[1];
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

app.get('/market/holidays', async (req,res) => {
    try {
        const {date} = req.query;

        const holidayUrl = `https://api.upstox.com/v2/market/holidays/${date ? date : ''}`;

        const holidayResponse = await axios.get(holidayUrl, {
            headers: {
                'Accept': 'application/json'
            }
        })

        console.log("HolidaysDate:  "+ JSON.stringify(holidayResponse.data))

        res.json(holidayResponse.data);
    } catch (error) {
        console.error('Error fetching market holidays:', error.response ? error.response.data : error.message);
        res.status(500).send('Error fetching market holidays');
    }
})


app.post('/order/place', async (req,res) => {
    try {
        const orderRequestBody = {
            "quantity": 1,
            "product": "D",
            "validity": "DAY",
            "price": 0,
            "tag": "string",
            "instrument_token": "NSE_EQ|INE848E01016",
            "order_type": "MARKET",
            "transaction_type": "BUY",
            "disclosed_quantity": 0,
            "trigger_price": 0,
            "is_amo": false
        }

        const config = {
            method: 'post',
            url: 'https://api.upstox.com/v2/order/place',
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            data: orderRequestBody
        };

        const response = await axios(config);

        console.log("Order Response: " + JSON.stringify(response.data))

        res.json(response.data);
    } catch (error) {
        console.log('Error placing order:', error.response ? error.response.data : error.message);
        res.status(500).send('Error placing order');
    }
})


app.get('/order/details', async (req, res) => {
    try {

        const { order_id } = req.query;
        
        const config = {
            method: 'get',
            url: 'https://api.upstox.com/v2/order/details',
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            },
            params: {
                order_id: order_id 
            }
        };

        
        const response = await axios(config);

        
        res.json(response.data);
    } catch (error) {
        console.error('Error retrieving order details:', error.response ? error.response.data : error.message);
        res.status(500).send('Error retrieving order details');
    }
});


app.get('/order/retrieve-all', async (req, res) => {
    try {
        const response = await axios.get('https://api.upstox.com/v2/order/retrieve-all', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error retrieving all orders:', error.response ? error.response.data : error.message);
        res.status(500).send('Error retrieving all orders');
    }
});


app.put('/order/modify', async (req, res) => {
    try {
        const { quantity, validity, price, order_id, order_type, disclosed_quantity, trigger_price, transaction_type } = req.body;
        console.log(quantity, validity, price, order_id, order_type, disclosed_quantity, trigger_price, transaction_type);
        if (!order_id) {
            return res.status(400).send('Order ID is required');
        }
        const requestBody = {
            quantity,
            validity,
            price,
            order_id,
            order_type,
            disclosed_quantity,
            trigger_price,
            transaction_type
        };
        const response = await axios.put('https://api.upstox.com/v2/order/modify', requestBody, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error modifying order:', error.response ? error.response.data : error.message);
        res.status(500).send('Error modifying order');
    }
});



app.delete('/order/cancel', async (req, res) => {
    try {
        const { order_id } = req.query;
        if (!order_id) {
            return res.status(400).send('Order ID is required');
        }
        const response = await axios.delete(`https://api.upstox.com/v2/order/cancel?order_id=${order_id}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error canceling order:', error.response ? error.response.data : error.message);
        res.status(500).send('Error canceling order');
    }
});


function establishConnection() {
    //const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('Access token not found in local storage');
        return;
    }
    const guid = uuidv4();
    const ws = new WebSocket('https://api.upstox.com/v2/feed/market-data-feed', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: '*/*'
        }
    });

    ws.on('open', () => {
        console.log('WebSocket connection established');
        const subscribeRequest = {
            guid: guid,
            method: 'sub',
            data: {
                mode: 'full',
                instrumentKeys: ['NSE_INDEX|Nifty Bank']
            }
        };
        ws.send(JSON.stringify(subscribeRequest));
    });

    ws.on('message', (data) => {
        console.log('Received message:', data);
    });

    ws.on('close', function () {
        console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
    });

    ws.on('unexpected-response', (request, response) => {
        if (response.statusCode === 302) {
            const redirectUrl = 'http://localhost:3000/auth/upstox/callback'
            console.log('Redirecting to:', redirectUrl);
            ws.close();
            console.log(response.headers)
        } else {
            console.error('Unexpected server response:', response.statusCode);
        }
    });
}





app.get('/websocket', (req, res) => {
    try {
        //const accessToken = req.headers.authorization.split(' ')[1];
        console.log("Access Token: " + accessToken);
        establishConnection();
        res.send('WebSocket connection initiated');
    } catch (error) {
        console.error('Error establishing WebSocket connection:', error.message);
        res.status(500).send('Error establishing WebSocket connection');
    }
})


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});