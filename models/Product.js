const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    name: { type: String },
    url: { type: String, required: true },
    pricing: [{
        date: String,
        price: Number,
        instock: String
    }]
});

module.exports = mongoose.model('Product', productSchema);