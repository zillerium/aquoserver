import {
    createRequire
} from "module";
const require = createRequire(import.meta.url);
import path from 'path';
import {
    fileURLToPath
} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/aquo');

var rwaSchema = new mongoose.Schema({
    dbKey: {
        type: String,
        default: null,
        unique: true,
        required: true,
        index: true
    },
    rwaId: {
        type: String,
        default: null
    },
    rwaDesc: {
        type: String,
        default: null
    },
    rwaPrice: {
        type: mongoose.Schema.Types.Decimal128,
        default: null
    },
    rwaPriceDate: {
        type: Date,
        default: Date.now
    },
    rwaCurrency: {
        type: String,
        default: null
    },
});


var rwaDBRec = mongoose.model("rwa", rwaSchema);

const fs = require("fs");
const http = require("http");
const https = require("https");
var request = require("request");
const cryptojs = require('crypto-js');

const express = require("express");

const app = express();
const cors = require('cors');
app.options('*', cors());

const asyncHandler = require("express-async-handler");
const result = require("dotenv").config();

request = require("request");
const bodyParser = require("body-parser");
var wget = require("node-wget");

const privateKey = fs.readFileSync("privkey.pem", "utf8");
const certificate = fs.readFileSync("fullchain.pem", "utf8");
// https://github.com/zillerium/tradedeal/blob/13db313ba4ca5d02c619ce3e60391fa7d05c5967/mongoavg.js
const credentials = {
    key: privateKey,
    cert: certificate,
};

app.use("/", express.static(path.join(__dirname, "/html")));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

//app.post("/getDBData", function (req, res) {
const updateRec = async (rwaRec, dbKey) => {

    var rtn = 0;
    rtn = await rwaDBRec.updateOne({
        'dbKey': dbKey
    }, {
        $set: rwaRec
    }, )

    return rtn;
}


const insertRec = async (rwaRec) => {
    try {
        await rwaRec.save(); // Save the document without a callback
        return 0; // Return 0 if save is successful
    } catch (err) {
        console.error(err); // Log the error if any
        return 1; // Return 1 if there is an error
    }
}



const addRwaDB = async (
    dbKey,
    rwaId,
    rwaDesc,
    rwaPrice,
    rwaPriceDate,
    rwaCurrency
) => {

    let jsonDB = {
        dbKey: dbKey,
        rwaId: rwaId,
        rwaDesc: rwaDesc,
        rwaPrice: rwaPrice,
        rwaPriceDate: rwaPriceDate,
        rwaCurrency: rwaCurrency
    };
    let rwaRec = new rwaDBRec(jsonDB);
    console.log(rwaRec);
    let rtn = 0;
    var found = false;
    found = await rwaDBRec.findOne({
        'dbKey': dbKey
    });
    if (found)
        rtn = await updateRec(jsonDB, dbKey);
    else
        rtn = await insertRec(rwaRec);


    return rtn;

}
const addRwaDBApi = async (
    dbKey,
    rwaId,
    rwaDesc,
    rwaPrice,
    rwaPriceDate,
    rwaCurrency
) => {

    let jsonDB = {
        dbKey: dbKey,
        rwaId: rwaId,
        rwaDesc: rwaDesc,
        rwaPrice: rwaPrice,
        rwaPriceDate: rwaPriceDate,
        rwaCurrency: rwaCurrency,
    };

    let rwaRec = new rwaDBRec(jsonDB);
    console.log(rwaRec);
    let rtn = 0;
    var found = false;
    found = await rwaDBRec.findOne({
        'dbKey': dbKey
    });
    if (found)
        rtn = await updateRec(jsonDB, dbKey);
    else
        rtn = await insertRec(rwaRec);


    return rtn;

}

app.get("/ping", cors(),
    asyncHandler(async (req, res, next) => {

        console.log('nodejs ccalled');
        res.json({
            message: "pong"
        });
    }));

//app.get("/ping", function (req, res) {
//  console.log('nodejs ccalled');
//      res.json({ message: "pong" });
//});
//app.get("/searchDB", function (req, res) {
// OCcurl https://peacioapi.com:3000/searchDB/hello%20there
app.get("/searchDB/:query", cors(),
    asyncHandler(async (req, res, next) => {
        let x = req.params.query;
        let recs = await rwaDBRec.find({
            $or: [{
                    rwaDesc: {
                        $regex: '.*' + x + '.*',
                        $options: 'i'
                    }
                },
                {
                    rwaId: {
                        $regex: '.*' + x + '.*',
                        $options: 'i'
                    }
                },


            ]

        })
        console.log(x);
        console.log(recs);
        res.json({
            data: [recs]
        });
    }))

app.get("/searchRwaDB/:query", cors(),
    asyncHandler(async (req, res, next) => {
        let x = req.params.query;
        let recs = await rwaDBRec.find({
            $or: [{
                    rwaDesc: {
                        $regex: '.*' + x + '.*',
                        $options: 'i'
                    }
                },

            ]

        })
        console.log(x);
        console.log(recs);
        res.json({
            data: [recs]
        });
    }))

app.get("/getRwa/:query", cors(),
    asyncHandler(async (req, res, next) => {
        let x = req.params.query;
        let xstr = "";
        if (x) xstr = x.toString();
        let json = {
            dbKey: {
                $regex: x,
                $options: 'i'
            }
        }

        let recs = await rwaDBRec.findOne(json);

        console.log(json);
        console.log(x);
        console.log(xstr);
        console.log(recs);
        res.json({
            data: [recs]
        });
    })
)



//app.get("/getDBData", function (req, res) {
app.post("/getDBData", cors(),
    asyncHandler(async (req, res, next) => {
        const keyword = req.body.keyword;

        console.log(req.body);
        console.log("keyword " + keyword);
        let data = {
            test: 'test'
        };

        res.json({
            data: data
        })
    })
);


app.post("/addRwaAPI", cors(),
    asyncHandler(async (req, res, next) => {


        const dbKey = req.body.dbKey;
        const rwaId = req.body.rwaId;
        const rwaDesc = req.body.rwaDesc;
        const rwaPrice = req.body.rwaPrice;
        const rwaPriceDate = req.body.rwaPriceDate;
        const rwaCurrency = req.body.rwaCurrency;

        console.log(req.body);
        // let rtn = 9;
        let rtn = await addRwaDB(
            dbKey,
            rwaId,
            rwaDesc,
            rwaPrice,
            rwaPriceDate,
            rwaCurrency

        );

        res.json({
            rtn: rtn
        })
    })
);
const httpsServer = https.createServer(credentials, app);
const httpServer = http.createServer(app);

httpsServer.listen(3001, () => {
    //httpServer.listen(3000, () => {
    console.log("HTTPS Server running on port 3001");
});
