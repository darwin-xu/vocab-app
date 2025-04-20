const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Vocabulary = require('./models/Vocabulary');

dotenv.config();
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set view engine
app.set('view engine', 'ejs');

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log(err));

// Routes
app.get('/', async (req, res) => {
    const vocabList = await Vocabulary.find();
    res.render('index', { vocabList });
});

app.post('/add', async (req, res) => {
    const { word, definition } = req.body;
    try {
        const newVocab = new Vocabulary({ word, definition });
        await newVocab.save();
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.send('Error saving vocabulary');
    }
});

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
