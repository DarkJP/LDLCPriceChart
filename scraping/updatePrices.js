const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const http = require('http');

const Product = require('./../models/Product');

function dbConnect() {
    return mongoose.connect('<mongodb data base>',
    { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Successfuly connected to DB');
    })
    .catch(() => console.log('Connection to DB failed'));
}

function dbDisconnect() {
    return mongoose.disconnect()
    .then(() => {
        console.log('Successfuly disconnected from DB');
    })
    .catch(() => console.log('Disconnection from DB failed'));
}

async function scrap(url, what) {

    const browser = await puppeteer.launch(/*{headless: false}*/);
    const page = await browser.newPage();

    await page.goto(url);

    const ldlc_prdt_name = '#activeOffer > div.title > h1';
    const ldlc_price = '#activeOffer > div.product-info > div.wrap-aside > aside > div.price > div';
    const ldlc_stock = '#product-page-stock > div.website > div.content > div > span';

    const val_prdt_name = await page.evaluate((sel) => {
        return document.querySelector(sel)?.innerText ?? 'Unknown Product';
    }, ldlc_prdt_name);

    const val_price = await page.evaluate((sel) => {
        return document.querySelector(sel)?.innerText ?? -1.0;
    }, ldlc_price);

    const val_stock = await page.evaluate((sel) => {
        return document.querySelector(sel)?.innerText.replace(/[\n\r]/g, ' ') ?? 'RUPTURE';
    }, ldlc_stock);

    browser.close();

    if (val_prdt_name == 'Unknown Product') {
        return 'SKIP';
    }

    return what == 'name' ? val_prdt_name : {price: val_price, stock: val_stock};
}

async function updateProductNames(products) {
    for (let prdt of products) {
        if (prdt.name == undefined) {
            let info = await scrap(prdt.url, 'name');

            if (info == 'SKIP') {
                console.log('updateProductNames l63: SKIP');

            } else {
                /* Mettre à jour le nom du produit dans la BD */
                await Product.updateOne({ _id: prdt._id },
                                        { $set: { name: info } });

                console.log('Found a new product: ' + info);
            }
        }
    }
}

async function updatePricing(products, dateToday) {
    for (let i = 0; i < products.length; i++) {

        let pricingLength = products[i].pricing.length;
        if ((pricingLength != 0 && products[i].pricing[pricingLength -1].date != dateToday)
            || pricingLength == 0) {

            let infos = await scrap(products[i].url, 'infos');

            if (infos == 'SKIP') {
                console.log('updatePricingl86: SKIP');
            } else {

                /* Convertir le prix en Float pour la BD */
                let priceFloat = infos.price.replace(/\s+/g, '');  // Retirer les espaces
                priceFloat = parseFloat(priceFloat.substring(0, priceFloat.indexOf('€'))
                             + '.' + priceFloat.substring(priceFloat.indexOf('€')+1));

                /* Insérer les nouvelles infos dans la BD */
                let new_infos = {date: dateToday, price: priceFloat, instock: infos.stock};
                await Product.updateOne({ _id: products[i]._id },
                                        { $push: { pricing: new_infos } });

                console.log('New price for "' + products[i].name + '": ' + priceFloat
                            + ' - Availability: ' + infos.stock);
            }

        } else {

            let lastPricing = products[i].pricing[products[i].pricing.length -1];
            if (lastPricing.instock != 'EN STOCK') {

                let scrapRes = await scrap(products[i].url, 'price');
                if (scrapRes.stock != 'RUPTURE') {

                    await Product.updateOne({ _id: products[i]._id, "pricing.date" : dateToday },
                                            { $set: { "pricing.$.instock": scrapRes.stock } });

                }
            }
        }
    }
}

async function checkProducts() {
    dbConnect()
    .then(async () => {
        let products = await Product.find();

        /* Mettre à jour les produits récemment ajoutés qui n'ont pas de nom */
        await updateProductNames(products);

        /* Récupérer la date du jour */
        let dateToday = new Date().toLocaleDateString('fr-FR');

        /* Récupérer le prix et la disponibilité des produits */
        await updatePricing(products, dateToday);

        console.log('Products updated.');

        /* Close DB connection */
        dbDisconnect()
        .then(() => console.log('End'))
        .catch(err => console.log('Couldn\'t disconnect from DB:\n' + err));
    })
    .catch(err => console.log('Whoops! Something went wrong:\n' + err));
}

checkProducts();