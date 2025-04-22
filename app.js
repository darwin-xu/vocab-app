const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Vocabulary = require('./models/vocabulary');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

app.use(cors({
    origin: 'https://darwin-xu.github.io'
}));

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

// GET route to render vocabulary list
app.get('/', async (req, res) => {
    try {
        const vocabList = await Vocabulary.find();  // Fetch all vocabulary entries
        res.render('index', { vocabList });
    } catch (error) {
        console.error(error);
        res.send('Error fetching data from database');
    }
});

// POST route to add a new word
app.post('/add', async (req, res) => {
    const { word, definition, example } = req.body;

    try {
        // Create a new vocabulary entry
        const newVocab = new Vocabulary({
            word,
            definition,
            dateAdded: new Date()     // Automatically set the current date
        });

        // Save the new word to the database
        await newVocab.save();
        res.redirect('/');  // Redirect back to the main page to see the updated list
    } catch (error) {
        console.error(error);
        res.send('Error adding word to database');
    }
});

// POST route to delete selected words
app.post('/delete', async (req, res) => {
    const deleteIds = req.body.deleteIds;  // Array of IDs of selected words to delete

    if (!deleteIds) {
        return res.redirect('/');  // If no words are selected, redirect back to the home page
    }

    try {
        // Delete the selected words from the database
        await Vocabulary.deleteMany({ _id: { $in: deleteIds } });
        res.redirect('/');  // Redirect back to the main page to see the updated list
    } catch (error) {
        console.error(error);
        res.send('Error deleting words from database');
    }
});

// Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
