const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
var http = require('http');

const Product = require('./models/Product');

async function scrap(url, what) {

    const browser = await puppeteer.launch(/*{headless: false}*/);
    const page = await browser.newPage();

    await page.goto(url);

    const ldlc_prdt_name = '#activeOffer > div.title > h1';
    const ldlc_price = '#activeOffer > div.product-info > div.wrap-aside > aside > div.price > div';
    const ldlc_stock = '#product-page-stock > div.website > div.content > div > span';

    const val_prdt_name = await page.evaluate((sel) => {
        return document.querySelector(sel).innerText;
    }, ldlc_prdt_name);

    const val_price = await page.evaluate((sel) => {
        return document.querySelector(sel).innerText;
    }, ldlc_price);

    const val_stock = await page.evaluate((sel) => {
        return document.querySelector(sel).innerText.replace(/[\n\r]/g, ' ');
    }, ldlc_stock);

    browser.close();

    return what == 'name' ? val_prdt_name : {price: val_price, stock: val_stock};
}

async function updateProductName(product) {
    let info = await scrap(product.url, 'name');

    /* Mettre à jour le nom du produit dans la BD */
    await Product.updateOne({ _id: product._id },
                            { $set: { name: info } });

    console.log('Found a new product: ' + info);
}

async function updatePricing(product, dateToday) {

    let infos = await scrap(product.url, 'infos');

    /* Convertir le prix en Float pour la BD */
    let priceFloat = infos.price.replace(/\s+/g, '');  // Retirer les espaces
    priceFloat = parseFloat(priceFloat.substring(0, priceFloat.indexOf('€'))
                 + '.' + priceFloat.substring(priceFloat.indexOf('€')+1));

    /* Insérer les nouvelles infos dans la BD */
    let new_infos = {date: dateToday, price: priceFloat, instock: infos.stock};
    await Product.updateOne({ _id: product._id },
                            { $push: { pricing: new_infos } });

    console.log('New price for "' + product.name + '": ' + priceFloat
                + ' - Availability: ' + infos.stock);
}

async function checkProduct(prdt_url) {

    let product = await Product.findOne({ url: prdt_url });

    /* Mettre à jour les produits récemment ajoutés qui n'ont pas de nom */
    await updateProductName(product);

    /* Récupérer la date du jour */
    let dateToday = new Date().toLocaleDateString('fr-FR');

    /* Mettre à jour le prix et le stock */
    await updatePricing(product, dateToday);

    console.log('New product update done');
}

module.exports = {updatePrdt: checkProduct};