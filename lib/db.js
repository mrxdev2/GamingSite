// lib/db.js
// Imebadilishwa kutoka JSON Files na sasa inatumia MongoDB Atlas ya Bure!
// Data zako sasa hazitafutika kamwe kwenye Render.

const { MongoClient } = require('mongodb');

// Link yako ya MongoDB Atlas uliyotengeneza
const uri = "mongodb+srv://mrxdeveloper2_db_user:P0DWc9vFOXICW4aa@cluster0.8n43fok.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

// Jina la database yako (itajiunda yenyewe)
const dbName = "myWebDatabase"; 
let db = null;

// Kazi ya kuunganisha database
async function connectDB() {
  if (db) return db;
  try {
    await client.connect();
    db = client.db(dbName);
    console.log("Database ya MongoDB imeunganishwa salama! 🎉");
    return db;
  } catch (error) {
    console.error("Imefeli kuunganisha MongoDB:", error);
    throw error;
  }
}

// Tunasubiri ijiunganishe yenyewe app inapoanza
connectDB();

/**
 * Kusoma Data kwenye Database
 */
async function readCollection(name) {
  try {
    const database = await connectDB();
    const collection = database.collection(name);
    // Inarudisha data zote kama Array ili isiharibu code zingine za app yako
    return await collection.find({}).toArray();
  } catch (e) {
    console.error(`Imefeli kusoma collection ${name}:`, e);
    return [];
  }
}

/**
 * Kuandika/Kusave Data zote kwenye Database
 */
async function writeCollection(name, data) {
  try {
    const database = await connectDB();
    const collection = database.collection(name);
    
    // Futa data za zamani zilizopo kwenye hiyo collection
    await collection.deleteMany({});
    
    // Kama kuna data mpya za kuweka, ziweke
    if (data && data.length > 0) {
      await collection.insertMany(data);
    }
    return true;
  } catch (e) {
    console.error(`Imefeli kuandika kwenye collection ${name}:`, e);
    return false;
  }
}

/**
 * Kutengeneza ID inayofuata (Auto-increment)
 */
function nextId(collection) {
  return collection.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}

module.exports = {
  readCollection,
  writeCollection,
  nextId,
};
