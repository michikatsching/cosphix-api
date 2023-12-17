'use strict';

const fetch = require('node-fetch');
async function download(url) {

    try{
    const response = await fetch(url);
    const buffer = await response.buffer();
    return buffer    
    }catch (error){
        return null
    }
      
}

module.exports = download