const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3001;

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'wordChainGame';
const COLLECTION_NAME = 'wordPairs';

let db;
let wordPairsCollection;

// Connect to MongoDB
async function connectDB() {
  try {
    const client = await MongoClient.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    db = client.db(DB_NAME);
    wordPairsCollection = db.collection(COLLECTION_NAME);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Build graph from word pairs
async function buildGraph() {
  const graph = {};
  
  try {
    const pairs = await wordPairsCollection.find({}).toArray();
    
    pairs.forEach(pair => {
      const start = pair.first_word.toLowerCase();
      const end = pair.second_word.toLowerCase();
      
      if (!graph[start]) {
        graph[start] = [];
      }
      graph[start].push(end);
    });
    
    return graph;
  } catch (error) {
    console.error('Error building graph:', error);
    throw error;
  }
}

// Generate a chain of 5 words
async function generateChain(graph, length = 5, maxAttempts = 100) {
  const words = Object.keys(graph);
  
  if (words.length === 0) {
    throw new Error('No word pairs in database');
  }
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const chain = [];
    let current = words[Math.floor(Math.random() * words.length)];
    chain.push(current);
    
    while (chain.length < length) {
      if (!graph[current] || graph[current].length === 0) {
        break;
      }
      
      const nextWord = graph[current][Math.floor(Math.random() * graph[current].length)];
      chain.push(nextWord);
      current = nextWord;
    }
    
    if (chain.length === length) {
      return chain;
    }
  }
  
  throw new Error('Could not generate valid chain after maximum attempts');
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/game/new', async (req, res) => {
  try {
    const graph = await buildGraph();
    const chain = await generateChain(graph);
    
    res.json({
      success: true,
      chain: chain,
      firstWord: chain[0],
      lastWord: chain[4],
      hints: [
        chain[1][0], // First letter of word 2
        chain[2][0], // First letter of word 3
        chain[3][0]  // First letter of word 4
      ]
    });
  } catch (error) {
    console.error('Error generating game:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/game/validate', async (req, res) => {
  try {
    const { word, position, chain } = req.body;
    
    if (!word || !chain || position === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const userWord = word.toLowerCase().trim();
    const correctWord = chain[position].toLowerCase();
    
    // Check if word matches
    const isValid = userWord === correctWord;
    
    res.json({
      success: true,
      valid: isValid,
      correctWord: correctWord
    });
  } catch (error) {
    console.error('Error validating word:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
async function startServer() {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  - GET  /api/game/new`);
    console.log(`  - POST /api/game/validate`);
    console.log(`  - GET  /api/health`);
  });
}

startServer();