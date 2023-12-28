const path = require('path');
const Product = require('../models/Product');
const updateProduct = require('../updatePrices_Server');

exports.getHomePage = (req, res, next) => {
    res.sendFile(path.join(__dirname, './../public', 'index.html'));
};

exports.getProducts = async (req, res, next) => {
    try {
        let products = await Product.find();
        res.status(200).json({ products })

    } catch (err) {
        res.status(400).json({ err });
    }
};

exports.addProduct = async (req, res, next) => {

    const BASE_URL = 'https://www.ldlc.com/fiche/';
    const prdt_url = BASE_URL + req.params.id + '.html';

    try {
        /* Chercher si le produit est déjà dans la BD */
        let prdt = await Product.findOne({ url: prdt_url });
        if (prdt == null) {  // Il n'y est pas

            const prdt = new Product({
                url: prdt_url
            });

            await prdt.save();
            await updateProduct.updatePrdt(prdt_url);
            res.status(201).json({message: 'Produit ajouté avec succès!'});

        } else {  // Il y est déjà

            res.status(404).json({ message: 'Ce produit a déjà été ajouté' })
        }
    } catch (err) {
        res.status(400).json({ message: 'Une erreur est survenue du côté du serveur.' })
    }
};

exports.deleteProduct = (req, res, next) => {

    Product.deleteOne({_id: req.params.id})
    .then(() => {
        res.status(200).json({message: 'Produit supprimé.'});
    })
    .catch(err => res.status(400).json({ err }));

};