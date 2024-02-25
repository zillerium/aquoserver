 
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

const bcrypt = require('bcrypt');
const saltRounds = 10;
var rwaIdSchema = new mongoose.Schema({
    idKey: {
        type: Number,
        default: 0,
        unique: true,
        required: true,
        index: true
    },
    rwaPassword: {
        type: String,
        default: null
    },
    rwaProspectusAddr: {
        type: String,
        default: null
    },
});

var rwaSchema = new mongoose.Schema({
    dbKey: {
        type: String,
        default: null,
        unique: true,
        required: true,
        index: true
    },
    rwaId: {
        type: Number,
        default: 0
    },
    rwaDesc: {
        type: String,
        default: null
    },
    rwaPrice: {
        type: mongoose.Schema.Types.Decimal128,
        default: 0
    },
    rwaPriceDate: {
        type: Date,
        default: Date.now
    },
    rwaCurrency: {
        type: String,
        default: 'USD'
    },
});


var rwaDBRec = mongoose.model("rwa", rwaSchema);

var rwaIdDBRec = mongoose.model("rwaId", rwaIdSchema);

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
 
app.get("/ping", cors(),
    asyncHandler(async (req, res, next) => {

        console.log('nodejs ccalled');
        res.json({
            message: "pong"
        });
    }));

 
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

app.get("/getRwa/:rwaId", cors(),
    asyncHandler(async (req, res, next) => {
        const rwaId = req.params.rwaId; // Get rwaId from the route parameter

        // Query the database for a document with the matching rwaId
        const record = await rwaDBRec.findOne({ rwaId: rwaId });

        console.log(record); // Log the found record to the console

        // Respond with the found record, or a suitable message if not found
        if (record) {
            res.json({ data: record });
        } else {
            res.status(404).send({ message: "Record not found" });
        }
    })
);


app.post("/addRwaAPI", cors(),
  asyncHandler(async (req, res, next) => {
    // Extracting fields from the request body
    const { dbKey, rwaId, rwaDesc, rwaPrice, rwaPriceDate, rwaCurrency, rwapassword } = req.body;
    console.log(req.body);

    // Hash and salt the rwapassword
    const rwapasswordsalt = await bcrypt.hash(rwapassword, saltRounds);

    // Find the record for the specific rwaId
    const record = await rwaIdDBRec.findOne({ idKey: rwaId });

    if (record) {
      // Compare the hashed passwords
      const match = await bcrypt.compare(rwapassword, record.rwaPassword);
console.log("password ", rwapasswordsalt);
console.log("password db ", record.rwaPassword);
      if (match) {
        // If the passwords match, proceed to add the data
        let rtn = await addRwaDB(
          dbKey,
          rwaId,
          rwaDesc,
          rwaPrice,
          rwaPriceDate,
          rwaCurrency
        );

        res.json({ rtn });
      } else {
        // If the passwords do not match, return an error
        res.json({ rtn: 500 });
      }
    } else {
      // If no record is found for the rwaId, return an error
      res.json({ rtn: 500 });
    }
  })
);


app.post("/addRwaAPI1", cors(),
    asyncHandler(async (req, res, next) => {
    // this adds the price into the database
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

app.get("/getAllRwa", cors(), 
  asyncHandler(async (req, res, next) => {
      // Query the database for all documents
      const records = await rwaIdDBRec.find({});

      // Map the retrieved records to the desired format
      const responseData = records.map(record => ({
          rwaid: record.idKey,
          rwaaddress: record.rwaProspectusAddr
      }));

      console.log(responseData); // Log the response data to the console

      // Respond with the mapped data
      res.json(responseData);
  })
);

app.post("/regRwaAPI", cors(),
    asyncHandler(async (req, res, next) => {
        const rwaPassword = req.body.rwaPassword;
        const rwaProspectusAddr = req.body.rwaProspectusAddr;
console.log("password = ", rwaPassword);
        try {
            // Find the current maximum idKey
            const maxIdRecord = await rwaIdDBRec.findOne().sort('-idKey').limit(1);
            const newIdKey = maxIdRecord ? maxIdRecord.idKey + 1 : 1; // If no records exist, start with 1

            // Hash the password before storing it
            bcrypt.hash(rwaPassword, saltRounds, async function(err, hash) {
                if (err) {
                    // Handle error
                    console.error(err);
                    res.status(500).json({
                        success: false,
                        message: 'An error occurred while hashing the password'
                    });
                    return;
                }

                // Create a new record with the new idKey, hashed password, and rwaProspectusAddr
                const newRecord = new rwaIdDBRec({
                    idKey: newIdKey,
                    rwaPassword: hash, // Store the hashed password
                    rwaProspectusAddr: rwaProspectusAddr
                });

                // Save the new record
                await newRecord.save();

                // Respond with success
                res.json({
                    success: true,
                    message: 'RWA registered successfully',
                    idKey: newIdKey
                });
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: 'An error occurred while registering RWA'
            });
        }
    })
);





const httpsServer = https.createServer(credentials, app);
const httpServer = http.createServer(app);

httpsServer.listen(3002, () => {
    //httpServer.listen(3000, () => {
    console.log("HTTPS Server running on port 3002");
});
