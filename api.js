'use strict';

let express = require('express');
let app = express();
const fetch = require("node-fetch");
const CryptoJS = require("crypto-js");
const mongoose = require("mongoose");
const ShortUrl = require("./models/shortUrl");
const SiteList = require("./models/site_list");
const UserList = require("./models/user");
const Checkouts = require("./models/checkout");
const Logs = require("./models/logs");
const Bugs = require("./models/bugs");
const setVersion = require("./models/version");
const bodyParser = require('body-parser')
const path = require('path');
const fs = require('fs');
var archiver = require('archiver');
const crypto = require('crypto');
const download = require('./download');
const { consumers } = require('stream');
var cookieParser = require('cookie-parser');
const Transform = require("stream").Transform
let WSServer = require('ws');
const keys = require('./keys.js');
const multer  = require('multer');
const AWS = require('aws-sdk');
const { json } = require('body-parser');
var useragent = require('express-useragent')
Date.prototype.addHours = function(h) {
  this.setTime(this.getTime() + (h*60*60*1000));
  return this;
}
const storage = multer.diskStorage({
  destination : 'uploads/',
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });
AWS.config.update({
  accessKeyId: keys.iam_access_id,
  secretAccessKey: keys.iam_secret,
  region: 'eu-central-1',
});
const s3= new AWS.S3();

const VERSION = 1.0
function check_header(header) {
  try {
    if (header == undefined) return false


    const then = new Date(CryptoJS.AES.decrypt(header, CryptoJS.enc.Utf8.parse("yBjTGeEBsvecNozT") ,{mode:CryptoJS.mode.ECB}).toString(CryptoJS.enc.Utf8));
    const now = new Date().addHours(0)
    if (Math.abs(then.getTime() - now.getTime()) / (60 * 60 * 1000) < 0.25) {return true}

    return false
  
  } catch {}


}

function check_data(data) {
  try {
    if (data == undefined) return false
    
    const datam = CryptoJS.AES.decrypt(data, CryptoJS.enc.Utf8.parse("OcmszUvmIFXzNHgC") ,{mode:CryptoJS.mode.ECB}).toString(CryptoJS.enc.Utf8);
    try {
      return JSON.parse(datam)
    }catch {
      return datam
    }

  } catch(error) {}
}


function detectMob(ua) {
  const toMatch = [
      /Android/i,
      /webOS/i,
      /iPhone/i,
      /iPad/i,
      /iPod/i,
      /BlackBerry/i,
      /Windows Phone/i
  ];
  
  return toMatch.some((toMatchItem) => {
      return ua.match(toMatchItem);
  });
}
app.use(useragent.express());
app.use(cookieParser("aiwdawihdawhdahwdaokwd"));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.json({limit: '50mb'}));
app.use(express.json());
app.use(bodyParser.json())
mongoose.connect("mongodb+srv://cosphixsoftware:s7CioNlM0RNkxrSB@cluster0.gqeww8k.mongodb.net/cosphix", {
  useNewUrlParser: true, useUnifiedTopology: true
})
const connection = mongoose.connection;

app.use(express.urlencoded({ extended: false}))



app.post('/short', async (req, res) => {
  

  if (check_header(req.headers["authorization"]) == false)  return res.status(403).send('FORBIDDEN')
  try {
    if (req.body.url == null) return res.sendStatus(404)
      
    const shortUrl = await ShortUrl.create({full: req.body.url})
      
    if (shortUrl.short == null) return res.sendStatus(404)
      
    res.send(shortUrl.short).status(200)
  
  } catch(err) {
    console.log(err)
    res.status(400)
  
  }
});

app.get("/short/:shortUrl", async (req, res) => {
  const shortUrl = await ShortUrl.findOne({short: req.params.shortUrl})
  if (shortUrl == null) return res.sendStatus(404)
  return res.redirect(shortUrl.full)
})

app.get("/checkout/:shortUrl", async (req, res) => {
  const shortUrl = await ShortUrl.findOne({short: req.params.shortUrl})
  if (shortUrl == null) return res.sendStatus(404)
  
  if (detectMob(req.headers['user-agent']) == false) return res.redirect(shortUrl.full)
  
  const buff = Buffer.from(shortUrl.full.split("https://cosphix.herokuapp.com/checkout?cookies=")[1], 'base64')
  const text = buff.toString('ascii');
  
  res.redirect(JSON.parse(text)["url"])

})

app.get("/checkout", async (req, res) => {
  if (req.query.cookies == null) return res.sendStatus(404)

  res.sendFile(path.join(__dirname, './download.html'));

})

app.post("/sitelist", async (req, res) => {
  try {
    if (check_header(req.headers["authorization"]) == false)  return res.status(403).send('FORBIDDEN')
    
    if (req.body.site == undefined) return res.sendStatus(422)
    
    const duplicate = await SiteList.findOne({"_id":req.body.site}).exec();
    if (duplicate) return res.sendStatus(409)


    await SiteList.create({
      "_id":req.body.site,
      "status":"active"
    });
    
    res.send("Success").status(200)
  } catch {
    res.status(400)
  }
})

app.put("/sitelist", async (req, res) => {
  try {
    if (check_header(req.headers["authorization"]) == false)  return res.status(403).send('FORBIDDEN')
    
    if (req.body.site == undefined) return res.sendStatus(422)
    
    const sitestatus = await SiteList.findOne({"_id":req.body.site})
    if (sitestatus == null) return res.sendStatus(409)

    sitestatus.status = req.body.status
    await sitestatus.save()
    res.send("Success").status(200)
  } catch {
    res.status(400)
  }
})
app.get("/sitelist", async (req, res) => {
  try {
  if (check_header(req.headers["authorization"]) == false)  return res.status(403).send('FORBIDDEN')
  
  const collection  = connection.db.collection("sites");
  
  res.json(await collection.find({}).toArray()).status(200)
} catch {
  res.status(400)
}
})



app.get("/quicktask/login", async (req, res) => {
  if (req.query.id == null) return res.sendStatus(404)
  const duplicate = await UserList.exists({"discord_uuid":req.query.id});
  if (duplicate == null)  return res.status(403).send('Invalid ID')
  res.cookie("session_id",req.query.id, {signed:true, maxAge: 9999999*60*60*24*7})
  const replacementTransform = new Transform()
    replacementTransform._transform = function(data, encoding, done) {
        const str = data.toString().replace(' To be redirected, click the CosphixAIO extension. ', `You can now use QuickTasks`)
        this.push(str)
        done()
    }

    res.write('<!-- Begin stream -->\n');
    let stream = fs.createReadStream('./download.html')
    stream.pipe(replacementTransform)
    .on('end', () => {
        res.write('\n<!-- End stream -->')
    }).pipe(res)
})

app.get("/quicktask", async (req, res) => {
  try {
    if (req.signedCookies['session_id'] == undefined) return res.status(403).send('FORBIDDEN')
    
    const duplicate = await UserList.exists({"id":req.signedCookies['session_id']});
    
    if (duplicate == null)  return res.status(400).send('Invalid ID')
    


    const store = req.query.store
    const url = req.query.url

    if (store == null) return res.status(422).send('Store Parameter Missing')
    if (url == null) return res.status(422).send('URL Parameter Missing')

    const ws = new WSServer("wss://cosphix.herokuapp.com/")

    ws.on('open', function open() {
      ws.send(JSON.stringify({
        "action":"quicktask",
        "store":store,
        "url":url,
        "id":req.signedCookies['session_id']
      }));
      ws.close()
    });
    const replacementTransform = new Transform()
    replacementTransform._transform = function(data, encoding, done) {
        const str = data.toString().replace(' To be redirected, click the CosphixAIO extension. ', `Signal sent`)
        this.push(str)
        done()
    }

    res.write('<!-- Begin stream -->\n');
    let stream = fs.createReadStream('./download.html')
    stream.pipe(replacementTransform)
    .on('end', () => {
        res.write('\n<!-- End stream -->')
    }).pipe(res)
  }  catch {
    return res.status(422)
  }
})

app.post("/checkouts", async (req, res) => {
  try {
    if (check_header(req.headers["authorization"]) == false)  return res.status(403).send('FORBIDDEN')
    
    
    const Product = req.body.product
    const Price = req.body.price
    const Store = req.body.store
    const DiscordID = req.body.discordid

    await Checkouts.create({
      "discordid":DiscordID,
      "product":Product,
      "price":Number(Price),
      "store":Store,
      "createdAt":new Date().toLocaleDateString()
    });
    res.send("Success").status(200)
  
  } catch{
    res.status(422)
  }
})

app.get("/checkouts",async (req, res) => {
  try {
    if (check_header(req.headers["authorization"]) == false)  return res.status(403).send('FORBIDDEN')
    const collection  = connection.db.collection("checkouts");
    
    const store = req.query.store
    const product = req.query.product
    const discordid = req.query.discordid
    const date = req.query.createdAt
    let find = {}
    if (store != undefined) find.store = store

    if (product != undefined) find.product = product

    if (discordid != undefined) find.discordid = discordid

    if (date != undefined) find.createdAt = date
    
    res.json(await collection.find(find).toArray()).status(200)
  
  } catch {
    res.status(422)
  }

})



app.post("/logs",async (req, res) => {
  try {
    if (check_header(req.headers["authorization"]) == false)  return res.status(403).send('FORBIDDEN')
    
    const discordid = req.body.discordid
    const log = req.body.logs
    const timestamp = req.body.timestamp
    
    const duplicate = await Logs.exists({"createdAt":String(timestamp)});
    
    if (duplicate == null) {
      await Logs.create({
        "discordid":discordid,
        "log":log,
        "createdAt":String(timestamp)
      })
    } else {
      await Logs.findOneAndUpdate(
        { createdAt: String(timestamp) },
        [{
          $set: {
            log: {
              $concat: ["$log", log]
            }
          }
        }]
      )
    }
    return res.send("Success").status(200)
  } catch (err){
    return res.status(422)
  
  }
})

app.get("/logs",async (req, res) => {
  try {
    
    const logsav  = connection.db.collection("logs");
    
    const discordid = req.query.discordid
    
    let find = {}
    if (discordid != undefined) find.discordid = discordid

    const arrayjs = await logsav.find(find).limit(10).toArray()
    const id = crypto.randomUUID()
    fs.mkdir(`${__dirname}/logs/${id}/`, { recursive: true }, (err) => {
      arrayjs.forEach(function(obj) {
        
          if (err) throw err;
          fs.writeFile(`${__dirname}/logs/${id}/${obj.createdAt}.txt`, obj.log, function(err, result) {
            if(err) console.log('error', err);
          });
        
      
      });
    });
    const prepareConfig = () => new Promise((resolve) => {
      const output = fs.createWriteStream(`${__dirname}/${id}.zip`);
      const archive = archiver('zip');
    
      output.on('end', () => (console.log('Data has been drained')));
      output.on('close', () => {
        resolve();
      });
    
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.log('Warning: ', err);
        } else {
          console.log('Error:');
          throw err;
        }
      });
    
      archive.on('error', (err) => {
        console.log('Error:');
        throw err;
      });
    
      archive.pipe(output);
      archive.directory(`${__dirname}/logs/${id}/`, false);
      archive.finalize();
    });

    await prepareConfig();






    res.download(`${__dirname}/${id}.zip`)
  } catch (err){
    console.log(err)
    res.status(422)
  }

})

app.get("/get-modules", async (req,res) => {
  if (check_header(req.headers["authorization"]) == false)  return res.status(403).send('FORBIDDEN')
  const store = req.query.module_name
  fs.readFile(`${__dirname}/modules/${store}.txt`, "utf-8", (err,data) => {
    if (err) {return}
    const module_code = data
    res.send(module_code)
  })
})

app.post("/bugs", async (req, res) => {
  try {
    
    if (check_header(req.headers["authorization"]) == false)  return res.status(403).send('FORBIDDEN')
    
    const Store = req.body.store
    const Bug = req.body.bug
    const Fix = req.body.fix
    const action = req.body.action
    
    if (action == "add") { 
      if (Fix != undefined) {
        await Bugs.create({
          "store":Store,
          "bug":Bug,
          "fix":Fix,
        });
      } else {
        await Bugs.create({
          "store":Store,
          "bug":Bug
        });
      }
      res.send("Success").status(200)
    } else {
      const bugs  = connection.db.collection("bugs");
      
      await bugs.findOneAndDelete({bug:Bug})
      res.send("Success").status(200)
    }
  } catch(err){
    return res.status(422)
  }
})

app.get("/bugs", async (req, res) => {
  try {
    
    const bugs  = connection.db.collection("bugs");
    res.json(await bugs.find({}).toArray()).status(200)
  
  } catch{return res.status(422)}
})

app.get("/download/test",async (req, res) => {
  const collection  = connection.db.collection("versions");
  const version = await collection.findOne({bot:"cosphix"})
  const getParams = {
      Bucket: 'cosphix',
      Key: "Cosphix.exe"
    };
    s3.getObject(getParams, function(err, data) {
      
      if (err){
        return res.status(400).send({success:false,err:err});
      } else{
        res.set('Access-Control-Expose-Headers', 'version').append('version', version.version).append('OS', "WINDOWS")
        res.attachment('CosphixAIO.exe');
        res.send(data.Body)
      }
    })
})

app.get("/download/initial",async (req, res) => {
  const collection  = connection.db.collection("versions");
    const version = await collection.findOne({bot:"cosphix"})
    if (req.useragent.isWindows == true) {
      const getParams = {
        Bucket: 'cosphixaiodownload',
        Key: "WindowsCosphixAIO.zip"
      };
      s3.getObject(getParams, function(err, data) {
        
        if (err){
          return res.status(400).send({success:false,err:err});
        } else{
          res.set('Access-Control-Expose-Headers', 'version').append('version', version.version).append('OS', "WINDOWS")
          res.attachment('WindowsCosphixAIO.zip');
          res.send(data.Body)
        }
      })
    } else {
      const getParams = {
        Bucket: 'cosphixaiodownload',
        Key: "CosphixAIO.zip"
      };
      s3.getObject(getParams, function(err, data) {
        if (err){
          return res.status(400).send({success:false,err:err});
        } else{
          res.set('Access-Control-Expose-Headers', 'version').append('version', version.version).append('OS', "MAC")
          res.attachment('CosphixAIO.zip');
          res.send(data.Body)
        }
      })
    }
})
app.get("/download/extension",async (req, res) => {
  try {
    let file = `${__dirname}/download/CosphixExtension.zip`;
    res.download(file)
    
  } catch {
    res.status(422)
  }
})


app.get("/download",async (req, res) => {
  try {
    const collection  = connection.db.collection("versions");
    const version = await collection.findOne({bot:"cosphix"})
    if (req.useragent.isWindows == true) {
      const getParams = {
        Bucket: 'cosphix',
        Key: "Cosphix.exe"
      };
      s3.getObject(getParams, function(err, data) {
        
        if (err){
          return res.status(400).send({success:false,err:err});
        } else{
          res.set('Access-Control-Expose-Headers', 'version').append('version', version.version).append('OS', "WINDOWS")
          res.attachment('Cosphix.exe');
          res.send(data.Body)
        }
      })
    } else {
      const getParams = {
        Bucket: 'cosphixaiodownload',
        Key: "MAC_AIOUPDATE.zip"
      };
      s3.getObject(getParams, function(err, data) {
        if (err){
          return res.status(400).send({success:false,err:err});
        } else{
          res.set('Access-Control-Expose-Headers', 'version').append('version', version.version).append('OS', "MAC")
          res.attachment('MAC_AIOUPDATE.zip');
          res.send(data.Body)
        }
      })
    }
  } catch {
    res.status(422)
  }
})

app.post("/version/set", async (req, res) => {
  try {
    //const collection  = connection.db.collection("version");
    await setVersion.findOneAndUpdate({bot:"cosphix"},{version:req.body.version,bot:"cosphix"}, {new: true})
    res.json({
      "success":true
    }).status(200)
  } catch(err) {
    res.status(400)
  }
})


app.get("/version", async (req, res) => {
  try {
    const version = await setVersion.findOne({bot:"cosphix"}).exec();
    res.json({"version":version.version}).status(200)
  } catch(err) {
    console.log(err)
    res.status(400)
  }
})

app.get('/proxy', async (req, res) => {

  let url = req.query.url
  
  let hash = crypto.createHash('md5').update(url).digest("hex");
  if(fs.existsSync(`${__dirname}/pictures/${hash}.jpg`)){

      res.header('Cache',"HIT");


      res.sendFile(`${__dirname}/pictures/${hash}.jpg`) 
  }else{

      let buffer = await download(url);
      if(buffer){
        console.log("awdawdawd")
        fs.writeFile(`${__dirname}/pictures/${hash}.jpg`, buffer,{flag:"w"},()   =>  {
        
          res.sendFile(`${__dirname}/pictures/${hash}.jpg`) 
          return})
      }else{
          res.send("Error")
      }
      
  }
})

app.get('/background', async (req, res) => {
  res.sendFile(`${__dirname}/pictures/background.jpg`)
})



app.get("/authenticate",async (req,res) => {
  try {
      if (check_header(req.headers["authorization"]) == false)  return res.status(403).send('FORBIDDEN')
      var discordID = req.body.data
      const data = check_data(discordID)
      if (data.license == null || data.machineid == null) return res.sendStatus(404)
      const payload = {
          metadata: {
              newKey: 'New Value',
          },
      };
      const headers = {
        Accept: "application/json",
        Authorization: "Bearer tVCVIcUpM2f4TyNLx0VCZbS1Zxwnl-etExD8R4C6MiI",
        "Content-Type": "application/json",
      };
      try {
        console.log(`https://api.whop.com/api/v2/memberships/${data.license}/validate_license`)
        const response = await fetch(`https://api.whop.com/api/v2/memberships/${data.license}/validate_license`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(payload),
        });
        const UserInfo = await response.json()
        console.log(UserInfo)
        const duplicate = await UserList.findOne({"discordid":UserInfo.discord.id}).exec();
        const test = await UserList.exists({"discordid":UserInfo.discord.id});
        console.log(duplicate,test)
        if (duplicate != null) {
          if (duplicate != null || duplicate.id != undefined) {
            console.log(duplicate.machineid,data.machineid)
            if (duplicate.machineid == data.machineid) {
                res.status(200)
                return res.json({
                  success:true,
                  username:UserInfo.discord.username,
                  machineid:data.machineid,
                  discord_uuid:duplicate.discord_uuid,
                  discord_id:UserInfo.discord.id,
                  image_url:UserInfo.discord.image_url
                })
              } else {
                res.status(400)
                return res.json({
                  success:false,
                  username:UserInfo.discord.username,
                  reason: "License already active on another device"
                })
              }
            }
          }
          const discord_uuid = crypto.randomUUID()
          await UserList.create({
            "username":UserInfo.discord.username,
            "discord_uuid":discord_uuid,
            "machineid":data.machineid,
            "discordid":UserInfo.discord.id
          })
          res.status(200)
          return res.json({
            success:true,
            username:UserInfo.discord.username,
            machineid:data.machineid,
            discord_uuid:discord_uuid,
            discord_id:UserInfo.discord.id,
            image_url:UserInfo.discord.image_url
          })
      } catch(error) {
          res.status(400)
          return res.json({
            success:false,
            reason: "License not found."
          })
        }
      
        
  } catch(error) {
    res.status(400)
    return res.json({
      success:false,
      reason: error
    })
  }
})

module.exports = app;
