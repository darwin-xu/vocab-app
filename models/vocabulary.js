const mongoose = require('mongoose');

const vocabSchema = new mongoose.Schema({
    word: {
        type: String,
        required: true,
        unique: true
    },
    definition: {
        type: String,
        required: true
    },
    dateAdded: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Vocabulary', vocabSchema);
